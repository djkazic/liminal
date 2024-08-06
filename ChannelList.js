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
import { fetchFee } from './Utils';

const ChannelList = () => {
  const [channels, setChannels] = useState(null);
  const [pendingOpenChannels, setPendingOpenChannels] = useState([]);
  const [pendingCloseChannels, setPendingCloseChannels] = useState([]);
  const [waitingCloseChannels, setWaitingCloseChannels] = useState([]);
  const [closedChannels, setClosedChannels] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isForceClose, setIsForceClose] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : '#282828';
  const longPressTimer = useRef();

  const closeChannel = () => {
    let finalFeeRate = feeRate;
    if (isForceClose) {
      finalFeeRate = 0;
    }
    NativeModules.LndModule.closeChannel(
      selectedItem.channelPoint,
      isForceClose,
      finalFeeRate,
    );
    setIsForceClose(false);
    closeModal();
  };

  const handleButtonPress = () => {
    longPressTimer.current = setTimeout(() => {
      setIsForceClose(true);
    }, 1000);
  };

  const handleButtonRelease = () => {
    clearTimeout(longPressTimer.current);
    closeChannel();
  };

  const copyToClipboard = text => {
    Clipboard.setString(text);
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
    try {
      const channels = await NativeModules.LndModule.listChannels();
      setChannels(channels);
      const pendingChannels = await NativeModules.LndModule.pendingChannels();
      if (pendingChannels) {
        const pendingOpen = [];
        const pendingClose = [];
        const waitingClose = [];

        for (const chan of pendingChannels) {
          if (chan.class === "Pending Open") {
            pendingOpen.push(chan);
          } else if (chan.class === "Pending Force Close") {
            pendingClose.push(chan);
          } else if (chan.class === "Waiting Close") {
            waitingClose.push(chan);
          }
        }

        setPendingOpenChannels(pendingOpen);
        setPendingCloseChannels(pendingClose);
        setWaitingCloseChannels(waitingClose);
      }
      const closedChannels = await NativeModules.LndModule.closedChannels();
      setClosedChannels(closedChannels);
    } catch (error) {
      console.log('Error fetching channels:', error);
      setTimeout(getChannels, 2000);
    }
  };

  useEffect(() => {
    const fetchAndSetFee = async () => {
      const hourFee = await fetchFee();
      setFeeRate(hourFee);
    };

    fetchAndSetFee();
    getChannels();
    const channelUpdateTimer = setInterval(getChannels, 1000);
    return () => clearInterval(channelUpdateTimer);
  }, []);

  const renderChannelItem = (item, type) => (
    <TouchableOpacity onPress={() => openModal(item)}>
      <View style={styles.transactionItem}>
        {type === 'open' && item.active ? (
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

  return (
    <>
      {channels && channels.length > 0 && (
        <View style={styles.wrapper}>
          <Text style={{ color: textColor }}>
            Open Channels
          </Text>
          <FlatList
            style={styles.container}
            data={channels}
            keyExtractor={item => item.channelPoint}
            renderItem={({ item }) => renderChannelItem(item, 'open')}
          />
        </View>
      )}
      {pendingOpenChannels && pendingOpenChannels.length > 0 && (
        <View style={styles.wrapper}>
          <Text style={{ color: textColor }}>
            Pending Open Channels ({pendingOpenChannels.length})
          </Text>
          <FlatList
            style={styles.container}
            data={pendingOpenChannels}
            keyExtractor={item => item.channelPoint}
            renderItem={({ item }) => renderChannelItem(item, 'pending')}
          />
        </View>
      )}
      {pendingCloseChannels && pendingCloseChannels.length > 0 && (
        <View style={styles.wrapper}>
          <Text style={{ color: textColor }}>
            Pending Force Close Channels ({pendingCloseChannels.length})
          </Text>
          <FlatList
            style={styles.container}
            data={pendingCloseChannels}
            keyExtractor={item => item.channelPoint}
            renderItem={({ item }) => renderChannelItem(item, 'pending')}
          />
        </View>
      )}
      {waitingCloseChannels && waitingCloseChannels.length > 0 && (
        <View style={styles.wrapper}>
          <Text style={{ color: textColor }}>
            Waiting Close Channels ({waitingCloseChannels.length})
          </Text>
          <FlatList
            style={styles.container}
            data={waitingCloseChannels}
            keyExtractor={item => item.channelPoint}
            renderItem={({ item }) => renderChannelItem(item, 'pending')}
          />
        </View>
      )}
      {closedChannels && closedChannels.length > 0 && (
        <View style={styles.wrapper}>
          <Text style={{ color: textColor }}>
            Closed Channels ({closedChannels.length})
          </Text>
          <FlatList
            style={styles.container}
            data={closedChannels}
            keyExtractor={item => item.channelPoint}
            renderItem={({ item }) => renderChannelItem(item, 'closed')}
          />
        </View>
      )}
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
                    {!selectedItem.class && (
                      selectedItem.active ? (
                        <Text style={{ color: '#57D272' }}>Active channel</Text>
                      ) : (
                        <Text style={{ color: '#E24C53' }}>Inactive channel</Text>
                      )
                    )}
                    {selectedItem.class && (
                      <Text>{selectedItem.class}</Text>
                    )}
                    {selectedItem.class && selectedItem.class == "Pending Force Close" && (
                      <>
                        <Text>Close tx: {selectedItem.closeTx}</Text>
                        <Text>Maturity height: {selectedItem.maturityHeight}</Text>
                        <Text>Blocks until maturity: {selectedItem.blocksTilMaturity}</Text>
                      </>
                    )}
                    <TouchableOpacity onPress={() => copyToClipboard(selectedItem.channelPoint)}>
                      <Text>Channel point: {selectedItem.channelPoint}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => copyToClipboard(selectedItem.remotePubkey)}>
                      <Text>Peer pubkey: {selectedItem.remotePubkey}</Text>
                    </TouchableOpacity>
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
              {!selectedItem.class && (
                <>
                  <View style={styles.inlineContainer}>
                    <Text>Co-op close fee rate (sat/vB):</Text>
                    <TextInput
                      style={styles.input}
                      value={isNaN(feeRate) ? '' : feeRate.toString()}
                      placeholder={feeRate.toString()}
                      onChangeText={text => setFeeRate(Number(text))}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text>Hold close channel button to force close</Text>
                  <TouchableOpacity
                    style={styles.buttonCloseChannel}
                    onPressIn={handleButtonPress}
                    onPressOut={handleButtonRelease}
                  >
                    <Text style={styles.textStyle}>
                      {isForceClose ? 'Force Close Channel' : 'Close Channel'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
    paddingTop: 10,
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
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
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
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    marginLeft: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 5,
    borderRadius: 5,
    flex: 1,
  },
  wrapper: {
    flex: 0.5,
  }
});

export default ChannelList;
