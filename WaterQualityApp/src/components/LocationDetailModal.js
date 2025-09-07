import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Button, Portal, Card, Chip } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const LocationDetailModal = ({ visible, location, selectedMonth, selectedYear, onDismiss }) => {
  if (!location || !location.prediction) {
    return null;
  }

  const { prediction, name, river, description } = location;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Good': return 'check-circle';
      case 'Moderate': return 'warning';
      case 'Poor': return 'error';
      default: return 'help';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good': return '#4CAF50';
      case 'Moderate': return '#FF9800';
      case 'Poor': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const getParameterStatus = (param, value) => {
    // Normalize missing/invalid numbers
    const num = Number(value);
    if (Number.isNaN(num)) return 'Unknown';

    switch (param) {
      case 'pH':
        if (num >= 6.5 && num <= 8.5) return 'Good';
        return 'Poor';
      case 'DO (mg/L)':
        if (num >= 5.0) return 'Good';
        if (num >= 3.0) return 'Moderate';
        return 'Poor';
      case 'BOD (mg/L)':
        if (num <= 3.0) return 'Good';
        if (num <= 6.0) return 'Moderate';
        return 'Poor';
      case 'FC MPN/100ml':
        // Fecal coliform: <50 good, 50-500 moderate, >500 poor
        if (num < 50) return 'Good';
        if (num <= 500) return 'Moderate';
        return 'Poor';
      case 'TC MPN/100ml':
        // Total coliform: <500 good, 500-1000 moderate, >1000 poor
        if (num < 500) return 'Good';
        if (num <= 1000) return 'Moderate';
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const parameters = [
    { key: 'pH', name: 'pH Level', unit: '', ideal: '6.5-8.5' },
    { key: 'DO (mg/L)', name: 'Dissolved Oxygen', unit: 'mg/L', ideal: '≥5.0' },
    { key: 'BOD (mg/L)', name: 'Biochemical Oxygen Demand', unit: 'mg/L', ideal: '≤3.0' },
    { key: 'FC MPN/100ml', name: 'Fecal Coliform', unit: 'MPN/100ml', ideal: '<50' },
    { key: 'TC MPN/100ml', name: 'Total Coliform', unit: 'MPN/100ml', ideal: '<500' },
  ];

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(month || new Date().getMonth() + 1) - 1];
  };

  // Generate last 6 months labels dynamically based on selected date
  const generateLast6Months = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    
    // Use selected month/year or current date as fallback
    const baseMonth = selectedMonth || new Date().getMonth() + 1;
    const baseYear = selectedYear || new Date().getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(baseYear, baseMonth - 1 - i, 1);
      labels.push(months[date.getMonth()]);
    }
    
    return labels;
  };

  // Sample historical data for chart (you can replace with real data)
  const chartData = {
    labels: generateLast6Months(),
    datasets: [
      {
        data: [
          prediction['pH'] + Math.random() * 0.5 - 0.25,
          prediction['pH'] + Math.random() * 0.5 - 0.25,
          prediction['pH'] + Math.random() * 0.5 - 0.25,
          prediction['pH'] + Math.random() * 0.5 - 0.25,
          prediction['pH'] + Math.random() * 0.5 - 0.25,
          prediction['pH'],
        ],
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      },
    ],
  };

  const cleanQualityString = (quality) => {
    if (!quality || typeof quality !== 'string') return quality;
    // remove exact repeated phrase like "X X" -> "X"
    const m = quality.trim().match(/^(.*)\s+\1$/i);
    return m ? m[1] : quality.trim();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onDismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header / Prediction summary */}
              <View style={styles.header}>
                    <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.locationName}>{cleanQualityString(name)}</Text>
                    <Text style={styles.riverName}>{cleanQualityString(river)} River</Text>
                    {description ? <Text style={styles.description}>{description}</Text> : null}
                  </View>

                  <View style={styles.predictionBox}>
                    <Text style={styles.predictionLabel}>Prediction</Text>
                    <Text style={styles.predictionDate}>{getMonthName(selectedMonth)} {selectedYear}</Text>
                    <View style={[styles.overallBadge, { backgroundColor: (prediction['Water Quality'] && cleanQualityString(prediction['Water Quality']).toLowerCase().includes('comply') ? '#4CAF50' : '#f44336') }]}>
                      <Text style={styles.overallBadgeText}>{cleanQualityString(prediction['Water Quality'])}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Parameters */}
              <View style={styles.parametersContainer}>
                <Text style={styles.sectionTitle}>Water Quality Parameters</Text>
                
                {parameters.map((param) => {
                  const value = prediction[param.key];
                  const status = getParameterStatus(param.key, value);

                  return (
                    <View key={param.key} style={styles.paramRow}>
                      <View style={{flex:1}}>
                        <Text style={styles.parameterName}>{param.name}</Text>
                        <Text style={styles.idealValue}>Ideal: {param.ideal}</Text>
                      </View>

                      <View style={styles.valueBlock}>
                        <Text style={styles.currentValue}>{value} {param.unit}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                          <Text style={styles.statusBadgeText}>{status}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Trend Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>pH Trend (Last 6 Months)</Text>
                <LineChart
                  data={chartData}
                  width={width - 80}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#2196F3',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>

              {/* Action Button */}
              <Button 
                mode="contained" 
                onPress={onDismiss}
                style={styles.closeButton}
              >
                Close
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 12,
  },
  locationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  riverName: {
    fontSize: 16,
    color: '#666',
    marginVertical: 5,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  qualityChip: {
    marginTop: 10,
  },
  predictionBox: {
    alignItems: 'flex-end',
  },
  predictionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  predictionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  overallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  overallBadgeText: {
    color: 'white',
    fontWeight: '800',
  },
  parametersContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  parameterCard: {
    marginBottom: 10,
    elevation: 2,
  },
  parameterContent: {
    paddingVertical: 10,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  valueBlock: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  parameterValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  idealValue: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  chartContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  closeButton: {
    marginTop: 10,
  },
});

export default LocationDetailModal;
