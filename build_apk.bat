@echo off
REM Build APK script for IronLog
REM This script builds a release APK using Gradle

cd /d c:\Users\User\Downloads\Projects\IronLog\android

echo ========================================
echo Building IronLog APK with Gradle
echo ========================================
echo.

REM Run the Gradle build for release APK
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build completed successfully!
    echo ========================================
    echo.
    echo APK location:
    echo c:\Users\User\Downloads\Projects\IronLog\android\app\build\outputs\apk\release\
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo Build FAILED!
    echo ========================================
    echo Please check the error messages above.
    echo.
    pause
)
