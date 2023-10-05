import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  NativeModules,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from './ThemeContext';

const ChannelList = () => {
  const [channels, setChannels] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isForceClose, setIsForceClose] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : '#282828';
  const longPressTimer = useRef();

  const closeChannel = () => {
    NativeModules.LndModule.closeChannel(
      selectedItem.channelPoint,
      isForceClose,
      feeRate
    );
    setIsForceClose(false);
    setFeeRate(0);
    closeModal();
  };

  const handleButtonPress = () => {
    longPressTimer.current = setTimeout(() => {
      setIsForceClose(true);
    }, 1000);
  };

  const handleButtonRelease = () => {
    clearTimeout(longPressTimer.current);
    if (!isForceClose) {
      closeChannel();
    }
  };

  const copyToClipboard = paymentRequest => {
    Clipboard.setString(paymentRequest);
    Toast.show({
      type: 'success',
      position: 'bottom',
      text1: 'Success',
      text2: 'Copied to clipboard',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 30,
      bottomOffset: 40,
    });
  };

  const openModal = item => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const getChannels = async () => {
    console.log('listchannels');
    try {
      console.log('Trying to get channels for list');
      const channels = await NativeModules.LndModule.listChannels();
      //TODO: node resolution
      setChannels(channels);
    } catch (error) {
      console.log('Error fetching channels:', error);
      setTimeout(getChannels, 2000);
    }
  };

  useEffect(() => {
    getChannels();
    const channelUpdateTimer = setInterval(getChannels, 1000);
    return () => clearInterval(channelUpdateTimer);
  }, []);

  return (
    <>
      <FlatList
        contentContainerStyle={{ paddingBottom: 20 }}
        style={styles.container}
        data={channels}
        keyExtractor={item => item.channelPoint}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity onPress={() => openModal(item)}>
              <View style={styles.transactionItem}>
                {item.active ? (
                  <Icon name="checkmark-circle" color="green" />
                ) : (
                  <Icon name="close-circle" color="red" />
                )}
                <Text style={{ color: textColor }}>
                  {item.remotePubkey.slice(0, 10) +
                    '...' +
                    item.remotePubkey.slice(-10)}
                </Text>
                <Text style={{ color: textColor }}>{item.capacity} sat</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {selectedItem && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Channel details</Text>
              {/* <TouchableOpacity style={styles.buttonClose} onPress={closeModal}>
                <Text style={styles.textStyle}>X</Text>
              </TouchableOpacity> */}
              {(() => {
                return (
                  <View style={{ marginTop: 10 }}>
                    {selectedItem.active ? (
                      <Text>Active channel</Text>
                    ) : (
                      <Text>Inactive channel</Text>
                    )}
                    <Text>Channel point: {selectedItem.channelPoint}</Text>
                    <Text>Peer pubkey: {selectedItem.remotePubkey}</Text>
                    {selectedItem.initiator ? (
                      <Text>Local initiator</Text>
                    ) : (
                      <Text>Remote initiator</Text>
                    )}
                    {selectedItem.private ? (
                      <Text>Private channel</Text>
                    ) : (
                      <Text>Public channel</Text>
                    )}
                    <Text>Local balance: {selectedItem.localBalance} sats</Text>
                    <Text>
                      Local reserve: {selectedItem.localChannelReserve} sats
                    </Text>
                    <Text>Remote balance: {selectedItem.remoteBalance}</Text>
                    <Text>
                      Remote reserve: {selectedItem.remoteChannelReserve}
                    </Text>
                  </View>
                );
              })()}
              <Text>{'\n'}</Text>
              {/* <Text>Close channel fee rate</Text>
              <TextInput
                style={[styles.input, { textColor }]}
                placeholder="Fee rate (sat/vB)"
                placholderTextColor="black"
                keyboardType="numeric"
                onChangeText={text => setFeeRate(Number(text))}
                value={feeRate.toString()}
              /> */}
              <Text>Closing fee rate (sat/vB)</Text>
              <TextInput
                style={styles.input}
                value={isNaN(feeRate) ? '' : feeRate.toString()}
                onChangeText={text => setFeeRate(Number(text))}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.buttonCloseChannel}
                onPressIn={handleButtonPress}
                onPressOut={handleButtonRelease}
              >
                <Text style={styles.textStyle}>
                  {isForceClose ? 'Force Close Channel' : 'Close Channel'}
                </Text>
              </TouchableOpacity>
              <Toast />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
    width: '100%',
  },
  amount: {
    fontSize: 16,
  },
  greenText: {
    color: '#57D272',
  },
  redText: {
    color: '#E24C53',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 20,
    elevation: 2,
    alignSelf: 'flex-end',
  },
  buttonCloseChannel: {
    backgroundColor: '#E24C53',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentRequest: {
    paddingTop: 20,
    paddingBottom: 10,
  },
});

export default ChannelList;
