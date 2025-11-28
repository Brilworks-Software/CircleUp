import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface WebCompatibleDateTimePickerProps {
  value: Date;
  mode: 'date' | 'time';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: any, selectedDate?: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export default function WebCompatibleDateTimePicker({
  value,
  mode,
  display = 'default',
  onChange,
  maximumDate,
  minimumDate,
}: WebCompatibleDateTimePickerProps) {
  // On web, use direct inline HTML inputs
  if (Platform.OS === 'web') {
    const handleWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      if (!inputValue) return;

      let selectedDate: Date;
      
      if (mode === 'time') {
        // For time mode, combine the selected time with the current date
        const [hours, minutes] = inputValue.split(':').map(Number);
        selectedDate = new Date(value);
        selectedDate.setHours(hours, minutes, 0, 0);
      } else {
        // For date mode, combine the selected date with the current time
        selectedDate = new Date(inputValue);
        selectedDate.setHours(value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds());
      }

      // Call the onChange handler with the expected event format
      onChange({ type: 'set', nativeEvent: { timestamp: selectedDate.getTime() } }, selectedDate);
    };

    const formatValueForWeb = () => {
      if (mode === 'time') {
        const hours = value.getHours().toString().padStart(2, '0');
        const minutes = value.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } else {
        const year = value.getFullYear();
        const month = (value.getMonth() + 1).toString().padStart(2, '0');
        const day = value.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    };

    const getWebInputType = () => {
      return mode === 'time' ? 'time' : 'date';
    };

    const getWebInputProps = () => {
      const props: any = {
        type: getWebInputType(),
        value: formatValueForWeb(),
        onChange: handleWebDateChange,
        style: {
          padding: '12px 16px',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: '16px',
          backgroundColor: '#ffffff',
          color: '#111827',
          minWidth: '150px',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          cursor: 'pointer',
        },
      };

      if (mode === 'date') {
        if (maximumDate) {
          props.max = maximumDate.toISOString().slice(0, 10);
        }
        if (minimumDate) {
          props.min = minimumDate.toISOString().slice(0, 10);
        }
      }

      return props;
    };

    return (
      <View style={styles.webDirectContainer}>
        <input {...getWebInputProps()} />
      </View>
    );
  }

  // On native platforms, use the original DateTimePicker
  return (
    <View style={styles.nativePickerContainer}>
      <DateTimePicker
        value={value}
        mode={mode}
        display={display}
        onChange={onChange}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        style={styles.nativePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webDirectContainer: {
    width: '100%',
    minWidth: 150,
  },
  nativePickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 50 : 'auto',
  },
});
