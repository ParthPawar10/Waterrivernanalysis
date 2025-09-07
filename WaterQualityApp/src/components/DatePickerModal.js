import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Button, Portal } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

const DatePickerModal = ({ 
  visible, 
  onDismiss, 
  onDateChange, 
  initialMonth, 
  initialYear 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];

  const years = Array.from({ length: 21 }, (_, i) => 2020 + i); // 2020-2040

  const handleApply = () => {
    onDateChange(selectedMonth, selectedYear);
    onDismiss();
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
            <Text style={styles.title}>Select Month and Year</Text>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Month</Text>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  style={styles.picker}
                >
                  {months.map((month) => (
                    <Picker.Item 
                      key={month.value} 
                      label={month.label} 
                      value={month.value} 
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Year</Text>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={styles.picker}
                >
                  {years.map((year) => (
                    <Picker.Item 
                      key={year} 
                      label={year.toString()} 
                      value={year} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={onDismiss}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleApply}
                style={styles.button}
              >
                Apply
              </Button>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    textAlign: 'center',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default DatePickerModal;
