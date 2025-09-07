import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Appbar, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { puneLocations, puneCenter } from '../data/locations';
import { mapStyle } from '../utils/theme';
import DatePickerModal from '../components/DatePickerModal';
import LocationDetailModal from '../components/LocationDetailModal';
import { WaterQualityPredictor } from '../utils/waterQualityModel';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [predictions, setPredictions] = useState({});
  
  const mapRef = useRef(null);
  const predictor = new WaterQualityPredictor();

  const handleLocationPress = (location) => {
    const prediction = predictor.predict(
      location.river,
      location.name,
      selectedMonth,
      selectedYear
    );
    
    setSelectedLocation({
      ...location,
      prediction
    });
  };

  const updatePredictions = (month, year) => {
    const newPredictions = {};
    puneLocations.forEach(location => {
      newPredictions[location.id] = predictor.predict(
        location.river,
        location.name,
        month,
        year
      );
    });
    setPredictions(newPredictions);
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const getMarkerColor = (locationId) => {
    const prediction = predictions[locationId];
    if (!prediction) return '#9E9E9E';
    
    return predictor.getQualityColor(prediction['Water Quality']);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content 
          title="Water Quality Monitor" 
          subtitle={`${getMonthName(selectedMonth)} ${selectedYear}`}
        />
        <Appbar.Action 
          icon="calendar" 
          onPress={() => setShowDatePicker(true)} 
        />
      </Appbar.Header>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={puneCenter}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >        
        {puneLocations.map((location) => (
          <Marker
            key={location.id}
            coordinate={location.coordinate}
            onPress={() => handleLocationPress(location)}
          >
            <View style={[
              styles.markerContainer,
              { backgroundColor: getMarkerColor(location.id) }
            ]}>
              <Icon 
                name="water-drop" 
                size={18} 
                color="white" 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Water Quality Status</Text>
        <View style={styles.statusItem}>
          <View style={[styles.statusColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>Complying</Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusColor, { backgroundColor: '#f44336' }]} />
          <Text style={styles.statusText}>Non-Complying</Text>
        </View>
      </View>

      <FAB
        style={styles.fab}
        icon="refresh"
        onPress={() => updatePredictions(selectedMonth, selectedYear)}
        label="Update"
      />

      <DatePickerModal
        visible={showDatePicker}
        onDismiss={() => setShowDatePicker(false)}
        onDateChange={updatePredictions}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />

      <LocationDetailModal
        visible={!!selectedLocation}
        location={selectedLocation}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onDismiss={() => setSelectedLocation(null)}
      />
    </View>
  );
};

const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height - 100,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  statusContainer: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 13,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  statusColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});

export default MapScreen;
