const { withMainApplication, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_PATH = "com/ecoguardian/ai";

function withEcoGuardianNative(config) {
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest.application) return cfg;
    const app = manifest.application[0];

    if (!app.service) app.service = [];

    const hasNotifListener = app.service.some(
      (s) => s.$?.["android:name"] === ".notifications.EcoGuardianNotificationListenerService"
    );
    if (!hasNotifListener) {
      app.service.push({
        $: {
          "android:name": ".notifications.EcoGuardianNotificationListenerService",
          "android:label": "EcoGuardian Notification Intelligence",
          "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "android.service.notification.NotificationListenerService" } }] },
        ],
      });
    }

    const hasLocationService = app.service.some(
      (s) => s.$?.["android:name"] === ".location.EcoGuardianLocationService"
    );
    if (!hasLocationService) {
      app.service.push({
        $: {
          "android:name": ".location.EcoGuardianLocationService",
          "android:foregroundServiceType": "location",
          "android:exported": "false",
        },
      });
    }

    if (!app.receiver) app.receiver = [];
    const hasBootReceiver = app.receiver.some(
      (r) => r.$?.["android:name"] === ".location.BootReceiver"
    );
    if (!hasBootReceiver) {
      app.receiver.push({
        $: {
          "android:name": ".location.BootReceiver",
          "android:exported": "true",
          "android:enabled": "true",
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }] },
        ],
      });
    }

    return cfg;
  });

  config = withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes("EcoGuardianPackage")) {
      contents = contents.replace(
        "import com.facebook.react.PackageList",
        "import com.facebook.react.PackageList\nimport com.ecoguardian.ai.EcoGuardianPackage"
      );
      contents = contents.replace(
        "return PackageList(this).packages",
        "val packages = PackageList(this).packages\n            packages.add(EcoGuardianPackage())\n            return packages"
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidDir = path.join(projectRoot, "android");
      const srcDir = path.join(androidDir, "app", "src", "main", "java", ...PACKAGE_PATH.split("/"));

      const notificationsDir = path.join(srcDir, "notifications");
      const locationDir = path.join(srcDir, "location");

      fs.mkdirSync(notificationsDir, { recursive: true });
      fs.mkdirSync(locationDir, { recursive: true });

      // EcoGuardianPackage.kt
      fs.writeFileSync(
        path.join(srcDir, "EcoGuardianPackage.kt"),
        `package com.ecoguardian.ai

import com.ecoguardian.ai.location.EcoGuardianLocationBridgeModule
import com.ecoguardian.ai.notifications.EcoGuardianNotificationBridgeModule
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class EcoGuardianPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            EcoGuardianNotificationBridgeModule(reactContext),
            EcoGuardianLocationBridgeModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`
      );

      // EcoGuardianNotificationListenerService.kt
      fs.writeFileSync(
        path.join(notificationsDir, "EcoGuardianNotificationListenerService.kt"),
        `package com.ecoguardian.ai.notifications

import android.content.Intent
import android.content.SharedPreferences
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class EcoGuardianNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "EcoGuardianNotifListener"
        private const val EVENT_NAME = "EcoGuardianNotificationReceived"
        private const val STATUS_EVENT = "EcoGuardianNotificationListenerStatusChanged"
        private const val QUEUE_PREFS = "ecoguardian_notification_queue"
        private const val QUEUE_KEY = "pending_notifications"
        private const val MAX_QUEUED = 200

        private var instance: EcoGuardianNotificationListenerService? = null

        fun getInstance(): EcoGuardianNotificationListenerService? = instance

        var pendingCount: Int = 0
            private set

        private val supportedPackages = setOf(
            "in.swiggy.android",
            "com.application.zomato",
            "com.grofers.customerapp",
            "com.zeptoconsumerapp",
            "com.blinkit.app",
            "com.swiggy.instamart",
            "com.bigbasket.android",
            "in.amazon.mShop.android.shopping",
            "com.flipkart.android",
            "com.ubercab",
            "com.olacabs.customer",
            "com.rapido.passenger",
            "com.theporter.android.customerapp",
            "com.google.android.apps.maps",
            "com.waze",
            "com.here.app",
            "com.citymapper.app"
        )
    }

    private fun getPrefs(): SharedPreferences =
        getSharedPreferences(QUEUE_PREFS, MODE_PRIVATE)

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.d(TAG, "Notification listener connected")
        broadcastStatus(true)
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.d(TAG, "Notification listener disconnected")
        broadcastStatus(false)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!supportedPackages.contains(sbn.packageName)) return

        try {
            val extras = sbn.notification.extras
            val title = extras.getCharSequence("android.title")?.toString().orEmpty()
            val body = extras.getCharSequence("android.text")?.toString().orEmpty()

            if (title.isEmpty() && body.isEmpty()) return

            val event = Arguments.createMap().apply {
                putString("packageName", sbn.packageName)
                putString("title", title)
                putString("body", body)
                putDouble("timestamp", sbn.postTime.toDouble())
            }

            if (sendEventToReactNative(event)) {
                Log.d(TAG, "Notification forwarded: \${sbn.packageName} | \$title")
            } else {
                queueNotification(sbn.packageName, title, body, sbn.postTime)
                Log.d(TAG, "Notification queued: \${sbn.packageName} | \$title")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {}

    private fun queueNotification(packageName: String, title: String, body: String, timestamp: Long) {
        try {
            val prefs = getPrefs()
            val raw = prefs.getString(QUEUE_KEY, "[]") ?: "[]"
            val arr = JSONArray(raw)

            if (arr.length() >= MAX_QUEUED) {
                arr.remove(0)
            }

            val obj = JSONObject().apply {
                put("packageName", packageName)
                put("title", title)
                put("body", body)
                put("timestamp", timestamp)
            }
            arr.put(obj)

            prefs.edit().putString(QUEUE_KEY, arr.toString()).apply()
            pendingCount = arr.length()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to queue notification", e)
        }
    }

    fun drainQueuedNotifications(): List<Map<String, Any>> {
        val results = mutableListOf<Map<String, Any>>()
        try {
            val prefs = getPrefs()
            val raw = prefs.getString(QUEUE_KEY, "[]") ?: "[]"
            val arr = JSONArray(raw)

            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                results.add(mapOf(
                    "packageName" to obj.getString("packageName"),
                    "title" to obj.getString("title"),
                    "body" to obj.getString("body"),
                    "timestamp" to obj.getLong("timestamp")
                ))
            }

            prefs.edit().remove(QUEUE_KEY).apply()
            pendingCount = 0
        } catch (e: Exception) {
            Log.e(TAG, "Failed to drain queue", e)
        }
        return results
    }

    private fun sendEventToReactNative(params: com.facebook.react.bridge.WritableMap): Boolean {
        try {
            val reactNativeHost = (applicationContext as? ReactApplication)?.reactNativeHost ?: return false
            val reactInstanceManager = reactNativeHost.reactInstanceManager ?: return false
            val reactContext = reactInstanceManager.currentReactContext

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, params)
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event to React Native", e)
        }
        return false
    }

    private fun broadcastStatus(enabled: Boolean) {
        try {
            val reactNativeHost = (applicationContext as? ReactApplication)?.reactNativeHost ?: return
            val reactInstanceManager = reactNativeHost.reactInstanceManager ?: return
            val reactContext = reactInstanceManager.currentReactContext

            val params = Arguments.createMap().apply {
                putBoolean("enabled", enabled)
            }

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(STATUS_EVENT, params)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to broadcast status", e)
        }
    }
}
`
      );

      // EcoGuardianNotificationBridgeModule.kt
      fs.writeFileSync(
        path.join(notificationsDir, "EcoGuardianNotificationBridgeModule.kt"),
        `package com.ecoguardian.ai.notifications

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class EcoGuardianNotificationBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "EcoGuardianNotificationBridge"

    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        try {
            val enabled = isNotificationListenerServiceEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openNotificationListenerSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            // Settings activity not available
        }
    }

    @ReactMethod
    fun drainQueuedNotifications(promise: Promise) {
        try {
            val serviceInstance = EcoGuardianNotificationListenerService.getInstance()
            if (serviceInstance != null) {
                val queued = serviceInstance.drainQueuedNotifications()
                val result = Arguments.createArray()
                for (item in queued) {
                    val map = Arguments.createMap()
                    map.putString("packageName", item["packageName"] as? String ?: "")
                    map.putString("title", item["title"] as? String ?: "")
                    map.putString("body", item["body"] as? String ?: "")
                    map.putDouble("timestamp", (item["timestamp"] as? Number)?.toDouble() ?: 0.0)
                    result.pushMap(map)
                }
                promise.resolve(result)
            } else {
                promise.resolve(Arguments.createArray())
            }
        } catch (e: Exception) {
            promise.resolve(Arguments.createArray())
        }
    }

    private fun isNotificationListenerServiceEnabled(): Boolean {
        val flat = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            "enabled_notification_listeners"
        )
        if (!TextUtils.isEmpty(flat)) {
            val myListener = ComponentName(
                reactApplicationContext,
                EcoGuardianNotificationListenerService::class.java
            ).flattenToString()
            val myService = ComponentName(
                reactApplicationContext,
                EcoGuardianNotificationListenerService::class.java
            ).flattenToShortString()
            val components = flat.split(":")
            for (component in components) {
                val cn = ComponentName.unflattenFromString(component)
                if (cn != null && (cn.flattenToString() == myListener || cn.flattenToShortString() == myService)) {
                    return true
                }
            }
        }
        return false
    }
}
`
      );

      // EcoGuardianLocationBridgeModule.kt
      fs.writeFileSync(
        path.join(locationDir, "EcoGuardianLocationBridgeModule.kt"),
        `package com.ecoguardian.ai.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.ecoguardian.ai.MainActivity
import com.ecoguardian.ai.R
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.*
import java.util.concurrent.TimeUnit

class EcoGuardianLocationBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "EcoGuardianLocationBridge"
        private const val NOTIFICATION_CHANNEL_ID = "ecoguardian_location"
        private const val NOTIFICATION_ID = 7700
        private const val LOCATION_UPDATE_EVENT = "EcoGuardianLocationUpdate"
        private const val LOCATION_STATUS_EVENT = "EcoGuardianLocationStatusChanged"
    }

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var isTracking = false
    private var lastKnownLocation: Location? = null

    override fun getName(): String = "EcoGuardianLocationBridge"

    @ReactMethod
    fun hasLocationPermission(promise: Promise) {
        try {
            val fine = ActivityCompat.checkSelfPermission(
                reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
            val coarse = ActivityCompat.checkSelfPermission(
                reactApplicationContext, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
            promise.resolve(fine || coarse)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun hasBackgroundLocationPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val bg = ActivityCompat.checkSelfPermission(
                    reactApplicationContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                promise.resolve(bg)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startBackgroundLocationTracking(promise: Promise) {
        try {
            val hasFine = ActivityCompat.checkSelfPermission(
                reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
            val hasCoarse = ActivityCompat.checkSelfPermission(
                reactApplicationContext, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasFine && !hasCoarse) {
                promise.resolve(false)
                return
            }

            if (isTracking) {
                promise.resolve(true)
                return
            }

            fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactApplicationContext)

            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, TimeUnit.SECONDS.toMillis(15))
                .setMinUpdateDistanceMeters(25f)
                .setMinUpdateIntervalMillis(10000)
                .setMaxUpdateDelayMillis(30000)
                .build()

            locationCallback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    val location = result.lastLocation ?: return
                    lastKnownLocation = location
                    sendLocationEvent(location)
                }
            }

            fusedLocationClient?.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )

            isTracking = true
            broadcastStatus(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService()
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start location tracking", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stopBackgroundLocationTracking(promise: Promise) {
        try {
            locationCallback?.let { callback ->
                fusedLocationClient?.removeLocationUpdates(callback)
            }
            locationCallback = null
            isTracking = false
            broadcastStatus(false)
            stopForegroundService()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun isTrackingActive(promise: Promise) {
        promise.resolve(isTracking)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getLastKnownLocation(promise: Promise) {
        try {
            val loc = lastKnownLocation
            if (loc != null) {
                val map = Arguments.createMap().apply {
                    putDouble("latitude", loc.latitude)
                    putDouble("longitude", loc.longitude)
                    putDouble("altitude", loc.altitude)
                    putDouble("accuracy", loc.accuracy.toDouble())
                    putDouble("speed", loc.speed.toDouble())
                    putDouble("heading", loc.bearing.toDouble())
                    putDouble("timestamp", loc.time.toDouble())
                }
                promise.resolve(map)
            } else {
                fusedLocationClient?.lastLocation?.addOnSuccessListener { location ->
                    if (location != null) {
                        lastKnownLocation = location
                        val map = Arguments.createMap().apply {
                            putDouble("latitude", location.latitude)
                            putDouble("longitude", location.longitude)
                            putDouble("altitude", location.altitude)
                            putDouble("accuracy", location.accuracy.toDouble())
                            putDouble("speed", location.speed.toDouble())
                            putDouble("heading", location.bearing.toDouble())
                            putDouble("timestamp", location.time.toDouble())
                        }
                        promise.resolve(map)
                    } else {
                        promise.resolve(null)
                    }
                }?.addOnFailureListener {
                    promise.resolve(null)
                }
            }
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun syncTrackingPreferences(prefsJson: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                "ecoguardian_tracking_prefs", Context.MODE_PRIVATE
            )
            val editor = prefs.edit()
            val jsonObj = org.json.JSONObject(prefsJson)
            val keys = jsonObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val value = jsonObj.get(key)
                when (value) {
                    is Boolean -> editor.putBoolean(key, value)
                    is String -> editor.putString(key, value)
                    is Int -> editor.putInt(key, value)
                    is Long -> editor.putLong(key, value)
                    is Float -> editor.putFloat(key, value)
                    is Double -> editor.putFloat(key, value.toFloat())
                }
            }
            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync tracking preferences", e)
            promise.resolve(false)
        }
    }

    private fun sendLocationEvent(location: Location) {
        try {
            val reactContext = reactApplicationContext
            if (reactContext is ReactApplication) {
                val reactInstanceManager = reactContext.reactNativeHost.reactInstanceManager
                val reactCtx = reactInstanceManager?.currentReactContext
                if (reactCtx != null && reactCtx.hasActiveReactInstance()) {
                    val event = Arguments.createMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putDouble("altitude", location.altitude)
                        putDouble("accuracy", location.accuracy.toDouble())
                        putDouble("speed", location.speed.toDouble())
                        putDouble("heading", location.bearing.toDouble())
                        putDouble("timestamp", location.time.toDouble())
                    }
                    reactCtx
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(LOCATION_UPDATE_EVENT, event)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send location event", e)
        }
    }

    private fun broadcastStatus(active: Boolean) {
        try {
            val reactContext = reactApplicationContext
            if (reactContext is ReactApplication) {
                val reactInstanceManager = reactContext.reactNativeHost.reactInstanceManager
                val reactCtx = reactInstanceManager?.currentReactContext

                val params = Arguments.createMap().apply {
                    putBoolean("active", active)
                }

                if (reactCtx != null && reactCtx.hasActiveReactInstance()) {
                    reactCtx
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(LOCATION_STATUS_EVENT, params)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to broadcast location status", e)
        }
    }

    private fun startForegroundService() {
        try {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "EcoGuardian Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracks your location to calculate carbon footprint"
            }
            val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)

            val intent = Intent(reactApplicationContext, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(reactApplicationContext, NOTIFICATION_CHANNEL_ID)
                .setContentTitle("EcoGuardian")
                .setContentText("Tracking your carbon footprint")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val serviceIntent = Intent(reactApplicationContext, EcoGuardianLocationService::class.java)
                reactApplicationContext.startForegroundService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service", e)
        }
    }

    private fun stopForegroundService() {
        try {
            val intent = Intent(reactApplicationContext, EcoGuardianLocationService::class.java)
            reactApplicationContext.stopService(intent)
        } catch (e: Exception) {
            // Service not running
        }
    }
}
`
      );

      // EcoGuardianLocationService.kt
      fs.writeFileSync(
        path.join(locationDir, "EcoGuardianLocationService.kt"),
        `package com.ecoguardian.ai.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.ecoguardian.ai.MainActivity
import com.ecoguardian.ai.R

class EcoGuardianLocationService : Service() {

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "ecoguardian_location"
        private const val NOTIFICATION_ID = 7700
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "EcoGuardian Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracks your location to calculate carbon footprint"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("EcoGuardian AI")
            .setContentText("Tracking your carbon footprint in the background")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
}
`
      );

      // BootReceiver.kt
      fs.writeFileSync(
        path.join(locationDir, "BootReceiver.kt"),
        `package com.ecoguardian.ai.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "EcoGuardianBootReceiver"
        private const val PREFS_NAME = "ecoguardian_tracking_prefs"
        private const val TRACKING_ENABLED_KEY = "tracking_enabled"
        private const val LOCATION_ENABLED_KEY = "location_enabled"
        private const val BACKGROUND_ENABLED_KEY = "background_enabled"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.d(TAG, "Device boot completed, checking tracking state")

        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val trackingEnabled = prefs.getBoolean(TRACKING_ENABLED_KEY, true)
            val locationEnabled = prefs.getBoolean(LOCATION_ENABLED_KEY, true)
            val backgroundEnabled = prefs.getBoolean(BACKGROUND_ENABLED_KEY, true)

            Log.d(TAG, "Tracking: master=\$trackingEnabled, location=\$locationEnabled, background=\$backgroundEnabled")

            if (trackingEnabled && (locationEnabled || backgroundEnabled)) {
                Log.d(TAG, "Restarting location service on boot")
                val serviceIntent = Intent(context, EcoGuardianLocationService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restart tracking on boot", e)
        }
    }
}
`
      );

      console.log("[EcoGuardian Plugin] Native modules written successfully");
      return cfg;
    },
  ]);

  return config;
}

module.exports = withEcoGuardianNative;
