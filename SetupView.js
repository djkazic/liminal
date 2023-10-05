import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';

const SetupView = () => {
  const navigation = useNavigation();
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('Create Wallet');
        }}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>
          Create Wallet
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { color: textColor }]}
        onPress={() => {
          navigation.navigate('Restore Wallet');
        }}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>
          Restore Wallet
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
});

export default SetupView;
