import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Button,
  StyleSheet,
  NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from './ThemeContext';
import { fetchFee } from './Utils';

const OpenChannelView = () => {
  const navigation = useNavigation();
  const [connectionURI, setConnectionURI] = useState('');
  const [announceChannel, setAnnounceChannel] = useState(false);
  const [localAmount, setLocalAmount] = useState('');
  const [feeRate, setFeeRate] = useState('');
  const [pendingChannelId, setPendingChannelId] = useState(null);
  const [openChannelTxId, setOpenChannelTxId] = useState(null);
  const [openChannelResult, setOpenChannelResult] = useState(null);
  const [connectPeerResult, setConnectPeerResult] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  // const connectPeer = async () => {
  //   console.log('connectpeer');
  //   try {
  //     const connectPeerResult =
  //       await NativeModules.LndModule.connectPeer(connectionURI);
  //     setConnectPeerResult(connectPeerResult);
  //   } catch (error) {
  //     console.log('Failed to connectpeer', error);
  //     setConnectPeerResult(error.toString());
  //   }
  // };

  const scan = async () => {
    try {
      const result = await request(PERMISSIONS.ANDROID.CAMERA);
      if (result === RESULTS.GRANTED) {
        console.log('Camera permissions granted');
        navigation.navigate('Scanner', { onQRCodeScanned });
      } else {
        console.log('Camera permissions denied');
      }
    } catch (error) {
      console.log('Camera permissions request error:', error);
    }
  };

  const onQRCodeScanned = code => {
    setConnectionURI(code);
  };

  const openChannel = async () => {
    console.log('connectpeer preopenchannel');
    setIsPaying(true);
    setOpenChannelResult("Connecting to peer...");
    try {
      await NativeModules.LndModule.connectPeer(connectionURI);
    } catch (error) {
      console.log('Failed to connectpeer', error);
    }
    console.log('openchannel');
    try {
      const parsedAmount = parseInt(localAmount, 10);
      const parsedFeeRate = parseInt(feeRate, 10);
      setOpenChannelResult("Opening channel...");
      await NativeModules.LndModule.openChannel(
        connectionURI,
        parsedAmount,
        parsedFeeRate,
        announceChannel
      );
    } catch (error) {
      console.log('Failed to openchannel', error);
      setOpenChannelResult(error.toString());
      setIsPaying(false);
    }
    setIsPaying(false);
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'OpenChannelUpdate',
      update => {
        console.log('Received OpenChannelUpdate: ', JSON.stringify(update));
        setOpenChannelResult('Open channel success');
        setPendingChannelId(update.pendingChanId);
        setOpenChannelTxId(update.fundingTxId);
        setIsPaying(false);
      }
    );

    const fetchAndSetFee = async () => {
      const hourFee = await fetchFee();
      setFeeRate(hourFee);
    };

    fetchAndSetFee();

    return () => {
      console.log('Tearing down OpenChannelUpdate subscription');
      subscription.remove();
    };
  }, []);

  return (
    <>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.settingItem}>
          <Text style={[styles.label, { color: textColor }]}>Node URI</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            placeholderTextColor={textColor}
            value={connectionURI}
            onChangeText={setConnectionURI}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 10, top: 3 }}
            onPress={scan}
          >
            <Icon name="camera-outline" color={textColor} size={32} />
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.label, { color: textColor }]}>
            Public channel
          </Text>
          <Switch
            value={announceChannel}
            onValueChange={setAnnounceChannel}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.label, { color: textColor }]}>Size (sats)</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            placeholderTextColor={textColor}
            value={localAmount}
            onChangeText={setLocalAmount}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.label, { color: textColor }]}>
            Fee rate (sat/vB)
          </Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            value={feeRate}
            onChangeText={setFeeRate}
            placeholder={feeRate.toString()}
            placeholderTextColor={textColor}
            keyboardType="numeric"
          />
        </View>

        {openChannelResult && (
          <View>
            {isPaying && <ActivityIndicator size="small" color="#00ff00"/>}
            <Text style={{ color: textColor }}>{openChannelResult}</Text>
          </View>
        )}

        {pendingChannelId && (
          <View style={styles.openChannelResult}>
            <Text style={{ color: textColor }}>
              Pending TXID: {pendingChannelId}
            </Text>
          </View>
        )}

        {/* {openChannelTxId && (
          <View style={styles.openChannelResult}>
            <Text style={{ color: textColor }}>
              Funded TXID: {openChannelTxId}
            </Text>
          </View>
        )} */}

        {connectPeerResult && (
          <View style={styles.openChannelResult}>
            <Text style={{ color: textColor }}>{connectPeerResult}</Text>
          </View>
        )}

        <View style={styles.spacer} />
        {/* <View style={styles.buttonContainer}>
          <Button title="Connect Peer" onPress={connectPeer} />
        </View> */}
        <View style={styles.buttonContainer}>
          <Button title="Open Channel" onPress={openChannel} />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    width: '60%', // Adjust as needed
  },
  buttonContainer: {
    marginBottom: 20,
  },
  openChannelResult: {
    marginBottom: 20,
  },
  spacer: {
    flex: 1,
  },
});

export default OpenChannelView;
