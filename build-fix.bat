@echo off
setlocal
set JAVA_HOME=D:\jdk-17.0.14+7
set PATH=%JAVA_HOME%\bin;%PATH%
set ANDROID_HOME=C:\Users\Asus\AppData\Local\Android\Sdk
set GRADLE_USER_HOME=D:\gradle-home
set TEMP=D:\promptwar\carbonfootprint\temp
set TMP=D:\promptwar\carbonfootprint\temp
set NODE_OPTIONS=--max-old-space-size=8192

cd /d D:\promptwar\carbonfootprint

echo [1/3] Running Expo prebuild...
call npx expo prebuild --clean --platform android
if %errorlevel% neq 0 (
    echo [ERROR] Prebuild failed.
    exit /b %errorlevel%
)

echo [2/3] Building release APK...
cd android
call gradlew.bat assembleRelease --no-daemon --stacktrace
if %errorlevel% neq 0 (
    echo [ERROR] Gradle build failed.
    exit /b %errorlevel%
)

cd /d D:\promptwar\carbonfootprint
echo [3/3] Copying APK...
copy /Y "android\app\build\outputs\apk\release\app-release.apk" "EcoGuardian-v21.0.0-release.apk"
if %errorlevel% neq 0 (
    echo [WARN] Could not copy APK.
) else (
    echo APK copied to: EcoGuardian-v21.0.0-release.apk
)

echo BUILD COMPLETE!
