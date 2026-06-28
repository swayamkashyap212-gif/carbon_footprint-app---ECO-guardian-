const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withTestReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const existing = mainApplication.receiver.find(
      (r) => r.$["android:name"] === ".notifications.TestNotificationReceiver"
    );

    if (!existing) {
      mainApplication.receiver.push({
        $: {
          "android:name": ".notifications.TestNotificationReceiver",
          "android:exported": "true",
          "android:enabled": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "com.ecoguardian.ai.TEST_NOTIFICATION",
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};
