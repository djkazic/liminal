import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, NativeModules } from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import { useNavigation } from '@react-navigation/native';

const LoadingScreen = () => {
  const [latch, setLatch] = useState(false);
  const navigation = useNavigation();

  const isRunning = async () => {
    console.log('isrunning');
    try {
      const lndStatus = await NativeModules.LndModule.getStatus();
      if (lndStatus == 'rpcactive' && !latch) {
        setTimeout(() => {
          setLatch(true);
          console.log('Exiting loader, rpactive');
          navigation.navigate('Home');
        }, 2000);
      } else if (lndStatus == 'gossipsync') {
        throw new Error('LND not running yet');
      }
    } catch (error) {
      console.log('Error checking lnd running:', error);
      setTimeout(isRunning, 2000);
    }
  };

  useEffect(() => {
    isRunning();
    const runCheckUpdateTime = setInterval(isRunning, 1000);
    return () => clearInterval(runCheckUpdateTime);
  }, []);

  return (
    <View style={styles.container}>
      <Spinner
        visible={true}
        textContent=""
        textStyle={styles.spinnerTextStyle}
      />
      <Text style={styles.text}>Rapid gossip syncing</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  text: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  spinnerTextStyle: {
    color: '#FFF',
  },
});

export default LoadingScreen;
