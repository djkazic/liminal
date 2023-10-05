import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, NativeModules } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';
import ChannelList from './ChannelList';

const ChannelScreen = () => {
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.channelListContainer}>
          <ChannelList />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  channelListContainer: {
    flex: 4,
    marginBottom: 85,
    paddingBottom: 20,
  },
});

export default ChannelScreen;
