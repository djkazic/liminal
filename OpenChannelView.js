import React, { useContext, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  View,
  Text,
  TextInput,
  Switch,
  Button,
  StyleSheet,
  NativeModules,
} from 'react-native';
import { ThemeContext } from './ThemeContext';

const OpenChannelView = () => {
  const [connectionURI, setConnectionURI] = useState('');
  const [announceChannel, setAnnounceChannel] = useState(false);
  const [localAmount, setLocalAmount] = useState(0);
  const [feeRate, setFeeRate] = useState(0);
  const [pendingChannelId, setPendingChannelId] = useState(null);
  const [openChannelTxId, setOpenChannelTxId] = useState(null);
  const [openChannelResult, setOpenChannelResult] = useState(null);
  const [connectPeerResult, setConnectPeerResult] = useState(null);
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const connectPeer = async () => {
    console.log('connectpeer');
    try {
      const connectPeerResult =
        await NativeModules.LndModule.connectPeer(connectionURI);
      setConnectPeerResult(connectPeerResult);
    } catch (error) {
      console.log('Failed to connectpeer', error);
      setConnectPeerResult(error.toString());
    }
  };

  const openChannel = async () => {
    console.log('connectpeer preopenchannel');
    try {
      await NativeModules.LndModule.connectPeer(connectionURI);
    } catch (error) {
      console.log('Failed to connectpeer', error);
    }
    console.log('openchannel');
    try {
      console.log(typeof localAmount);
      console.log(typeof feeRate);
      await NativeModules.LndModule.openChannel(
        connectionURI,
        localAmount,
        feeRate,
        announceChannel
      );
    } catch (error) {
      console.log('Failed to openchannel', error);
      setOpenChannelResult(error.toString());
    }
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'OpenChannelUpdate',
      update => {
        console.log('Received OpenChannelUpdate: ', update);
        setOpenChannelResult('Open channel success');
        setPendingChannelId(update.pendingChanId);
        setOpenChannelTxId(update.fundingTxId);
      }
    );

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
            value={localAmount.toString()}
            onChangeText={text => setLocalAmount(Number(text))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.label, { color: textColor }]}>
            Fee rate (sat/vB)
          </Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            placeholderTextColor={textColor}
            value={feeRate.toString()}
            onChangeText={text => setFeeRate(Number(text))}
            keyboardType="numeric"
          />
        </View>

        {openChannelResult && (
          <View>
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

        {openChannelTxId && (
          <View style={styles.openChannelResult}>
            <Text style={{ color: textColor }}>
              Funded TXID: {openChannelTxId}
            </Text>
          </View>
        )}

        {connectPeerResult && (
          <View style={styles.openChannelResult}>
            <Text style={{ color: textColor }}>{connectPeerResult}</Text>
          </View>
        )}

        <View style={styles.spacer} />
        <View style={styles.buttonContainer}>
          <Button title="Connect Peer" onPress={connectPeer} />
        </View>
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
