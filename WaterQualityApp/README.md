# Water Quality Monitor - React Native App

A React Native mobile application for monitoring water quality in Pune's rivers (Mula, Mutha, and Mula-Mutha) using machine learning predictions.

## Features

🗺️ **Interactive Map**
- Shows Pune city with river locations
- Real-time water quality predictions
- Color-coded markers for water quality status

📅 **Date Selection**
- Select any month and year for predictions
- Future predictions up to 2040
- Historical trend analysis

📊 **Detailed Analytics**
- pH, Dissolved Oxygen, BOD levels
- Fecal and Total Coliform counts
- Water quality compliance status
- Trend charts for each parameter

🏞️ **River Monitoring**
- 8 monitoring locations across 3 rivers
- Real-time quality assessments
- Location-specific predictions

## Setup Instructions

### Prerequisites
- Node.js (14 or higher)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone and Setup**
   ```bash
   cd WaterQualityApp
   npm install
   ```

2. **Install Expo CLI (if not already installed)**
   ```bash
   npm install -g expo-cli
   ```

3. **Start the Development Server**
   ```bash
   expo start
   ```

4. **Run on Device**
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app

### Google Maps Setup (Required)

1. **Get Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Maps SDK for iOS/Android
   - Create API key

2. **Configure API Key**
   - Create `app.config.js` in root directory:
   ```javascript
   export default {
     expo: {
       // ... other config
       android: {
         config: {
           googleMaps: {
             apiKey: "YOUR_GOOGLE_MAPS_API_KEY_HERE"
           }
         }
       },
       ios: {
         config: {
           googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY_HERE"
         }
       }
     }
   };
   ```

## Project Structure

```
WaterQualityApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DatePickerModal.js
│   │   └── LocationDetailModal.js
│   ├── data/               # Static data and configurations
│   │   └── locations.js    # Pune locations and river paths
│   ├── screens/            # Main application screens
│   │   └── MapScreen.js    # Main map interface
│   └── utils/              # Utilities and helpers
│       ├── theme.js        # App theming
│       └── waterQualityModel.js  # ML prediction model
├── App.js                  # Main application entry
├── package.json           # Dependencies
└── app.json              # Expo configuration
```

## Key Components

### MapScreen
- Main interface with interactive map
- Displays all monitoring locations
- Handles user interactions and predictions

### DatePickerModal
- Month and year selection interface
- Updates predictions for selected time period

### LocationDetailModal
- Detailed view for each monitoring location
- Shows all water quality parameters
- Includes trend charts and status indicators

### WaterQualityPredictor
- Simplified ML model for mobile app
- Predicts all 5 water quality parameters
- Based on trained Random Forest model

## Data Sources

### Monitoring Locations
- **Mula River**: Aundh Bridge, Harrison Bridge
- **Mutha River**: Khadakvasla Dam, Deccan Bridge, Veer Savarkar Bhavan, Sangam Bridge
- **Mula-Mutha**: Mundhawa Bridge, Theur

### Parameters Monitored
- **pH**: Acidity/alkalinity (6.5-8.5 ideal)
- **DO**: Dissolved Oxygen (≥5.0 mg/L ideal)
- **BOD**: Biochemical Oxygen Demand (≤3.0 mg/L ideal)
- **FC**: Fecal Coliform (<50 MPN/100ml ideal)
- **TC**: Total Coliform (<500 MPN/100ml ideal)

## Machine Learning Model

The app uses a simplified version of the Random Forest model trained on historical data:
- **Training Period**: 2017-2021
- **Validation Period**: 2022-2023
- **Features**: River, Location, Month, Season, Year
- **Outputs**: pH, DO, BOD, FC, TC, Water Quality Classification

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Future Enhancements

🔮 **Planned Features**
- Real-time data integration via API
- Push notifications for quality alerts
- Historical data visualization
- Water quality improvement suggestions
- Social sharing of reports
- Offline data caching

📱 **Technical Improvements**
- Redux for state management
- GraphQL for data fetching
- Background sync capabilities
- Enhanced animations
- Accessibility improvements

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support


---

Built with ❤️ for cleaner rivers in Pune
