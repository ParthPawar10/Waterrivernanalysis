#!/bin/bash

# Water Quality App Quick Start Script
echo "🌊 Starting Water Quality Prediction App..."
echo ""

# Check if Google Maps API key is configured
if grep -q "YOUR_GOOGLE_MAPS_API_KEY_HERE" app.json; then
    echo "⚠️  WARNING: Google Maps API key not configured!"
    echo "   Please edit app.json and replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your actual API key"
    echo "   Get your API key from: https://console.cloud.google.com/"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the app
echo "🚀 Starting Expo development server..."
echo "   • Press 'i' to open iOS simulator"
echo "   • Press 'a' to open Android emulator" 
echo "   • Scan QR code with Expo Go app on your phone"
echo "   • Press 'w' to open in web browser"
echo ""

npx expo start
