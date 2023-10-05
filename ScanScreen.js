import React, { useCallback } from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { StyleSheet, View } from 'react-native';

const ScanScreen = ({ route, navigation }) => {
  const onQRCodeScanned = useCallback(
    async e => {
      try {
        console.log(e.data);
        if (route.params.onQRCodeScanned) {
          route.params.onQRCodeScanned(e.data);
        }
        navigation.goBack();
      } catch (error) {
        console.error('Error during QR code scanning:', error);
      }
    },
    [navigation, route.params]
  );

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onQRCodeScanned}
        reactivate={true}
        reactivateTimeout={5000}
        showMarker={true}
        markerStyle={{ borderColor: 'white' }}
        cameraStyle={styles.preview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#282828',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});

export default ScanScreen;
