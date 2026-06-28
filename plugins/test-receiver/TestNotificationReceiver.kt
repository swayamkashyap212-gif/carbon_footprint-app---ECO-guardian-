package com.ecoguardian.ai.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class TestNotificationReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TestNotifReceiver"
        private const val EVENT_NAME = "EcoGuardianNotificationReceived"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val packageName = intent.getStringExtra("packageName") ?: return
        val title = intent.getStringExtra("title") ?: ""
        val body = intent.getStringExtra("body") ?: ""
        val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())

        Log.d(TAG, "Received test notification: pkg=$packageName title=$title body=$body")

        val event = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("title", title)
            putString("body", body)
            putDouble("timestamp", timestamp.toDouble())
        }

        try {
            val reactNativeHost = (context.applicationContext as? ReactApplication)?.reactNativeHost
            val reactInstanceManager = reactNativeHost?.reactInstanceManager
            val reactContext = reactInstanceManager?.currentReactContext

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, event)
                Log.d(TAG, "Test notification forwarded to React Native")
            } else {
                Log.w(TAG, "React Native context not ready, queuing notification")
                queueTestNotification(context, packageName, title, body, timestamp)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send test notification", e)
        }
    }

    private fun queueTestNotification(context: Context, packageName: String, title: String, body: String, timestamp: Long) {
        try {
            val prefs = context.getSharedPreferences("ecoguardian_notification_queue", Context.MODE_PRIVATE)
            val raw = prefs.getString("pending_notifications", "[]") ?: "[]"
            val arr = org.json.JSONArray(raw)

            val obj = org.json.JSONObject().apply {
                put("packageName", packageName)
                put("title", title)
                put("body", body)
                put("timestamp", timestamp)
            }
            arr.put(obj)
            prefs.edit().putString("pending_notifications", arr.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to queue test notification", e)
        }
    }
}
