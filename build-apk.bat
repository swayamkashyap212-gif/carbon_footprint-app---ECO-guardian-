@echo off
set NODE_OPTIONS=--max-old-space-size=8192
set TEMP=D:\promptwar\carbonfootprint\temp
set TMP=D:\promptwar\carbonfootprint\temp
set TMPDIR=D:\promptwar\carbonfootprint\temp
set JAVA_HOME=D:\jdk-17.0.12
set PATH=%JAVA_HOME%\bin;%PATH%
set ANDROID_HOME=C:\Users\Asus\AppData\Local\Android\Sdk
set GRADLE_USER_HOME=D:\gradle-home

cd /d D:\promptwar\carbonfootprint

echo [1/4] Running Expo prebuild...
call npx expo prebuild --clean --platform android
if %errorlevel% neq 0 (
    echo [ERROR] Prebuild failed. Check above for details.
    exit /b %errorlevel%
)

echo [1.5/4] Copying test receiver and proguard rules...
copy /Y "plugins\test-receiver\TestNotificationReceiver.kt" "android\app\src\main\java\com\ecoguardian\ai\notifications\TestNotificationReceiver.kt"
echo -keep class com.ecoguardian.ai.notifications.TestNotificationReceiver { *; } >> android\app\proguard-rules.pro

echo [2/4] Building release APK...
cd android
set JAVA_HOME=D:\jdk-17.0.12
set PATH=%JAVA_HOME%\bin;%PATH%
call gradlew.bat assembleRelease --no-daemon --stacktrace
if %errorlevel% neq 0 (
    echo [ERROR] Gradle build failed. Check above for details.
    exit /b %errorlevel%
)

cd /d D:\promptwar\carbonfootprint
echo [3/4] Copying APK to project root...
copy /Y "android\app\build\outputs\apk\release\app-release.apk" "EcoGuardian-v22.0.0-release.apk"
if %errorlevel% neq 0 (
    echo [WARN] Could not copy APK. It may still be at: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo APK copied to: EcoGuardian-v22.0.0-release.apk
)

echo [4/4] Build complete!
echo.
echo To install via USB: adb install -r EcoGuardian-v22.0.0-release.apk
