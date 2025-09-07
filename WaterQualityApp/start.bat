@echo off
REM Water Quality App Quick Start Script for Windows

echo 🌊 Starting Water Quality Prediction App...
echo.

REM Check if Google Maps API key is configured
findstr /C:"YOUR_GOOGLE_MAPS_API_KEY_HERE" app.json >nul
if %errorlevel% == 0 (
    echo ⚠️  WARNING: Google Maps API key not configured!
    echo    Please edit app.json and replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your actual API key
    echo    Get your API key from: https://console.cloud.google.com/
    echo.
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    echo.
)

REM Start the app
echo 🚀 Starting Expo development server...
echo    • Press 'i' to open iOS simulator
echo    • Press 'a' to open Android emulator
echo    • Scan QR code with Expo Go app on your phone
echo    • Press 'w' to open in web browser
echo.

npx expo start
