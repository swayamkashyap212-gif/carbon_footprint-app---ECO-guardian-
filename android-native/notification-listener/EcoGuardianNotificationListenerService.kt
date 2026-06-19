package com.ecoguardian.ai.notifications

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
        Log.d(TAG, "Notification listener connected")
        broadcastStatus(true)
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
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
                Log.d(TAG, "Notification forwarded: ${sbn.packageName} | $title")
            } else {
                queueNotification(sbn.packageName, title, body, sbn.postTime)
                Log.d(TAG, "Notification queued: ${sbn.packageName} | $title")
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
