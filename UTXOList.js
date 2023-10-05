import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  NativeModules,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import useDataFetching from './hooks/DataFetching';
import { ThemeContext } from './ThemeContext';

const UTXOList = () => {
  const [utxos, setUtxos] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { isDarkTheme } = useContext(ThemeContext);
  const textColor = isDarkTheme ? 'white' : 'black';

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

  const getUtxos = async () => {
    console.log('getutxos');
    try {
      const utxos = await NativeModules.LndModule.listUnspent();
      setUtxos(utxos);
    } catch (error) {
      console.log('Error fetching utxos:', error);
      setTimeout(getUtxos, 2000);
    }
  };

  useDataFetching(getUtxos, 1000);
  useFocusEffect(
    React.useCallback(() => {
      getUtxos();
    }, [])
  );

  return (
    <>
      <FlatList
        contentContainerStyle={{ paddingBottom: 20 }}
        style={[styles.container, { flex: 1 }]}
        data={utxos}
        keyExtractor={item => item.address}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity onPress={() => openModal(item)}>
              <View style={styles.transactionItem}>
                <View>
                  <Text
                    style={[
                      styles.amount,
                      item.amount >= 0 ? styles.greenText : styles.redText,
                    ]}
                  >
                    {item.amount} sats
                  </Text>
                  <Text style={{ color: textColor }}>{item.confs} confs</Text>
                  <Text style={{ color: textColor }}>{item.address}</Text>
                </View>
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
              <Text style={styles.modalTitle}>UTXO details</Text>
              <QRCode
                value={selectedItem.address}
                size={200}
                style={{ paddingBottom: 10 }}
              />
              {(() => {
                return (
                  <View style={{ marginTop: 10 }}>
                    <Text>{selectedItem.address}</Text>
                  </View>
                );
              })()}
              <TouchableOpacity
                onPress={() => copyToClipboard(selectedItem.pr)}
              >
                <Text style={styles.paymentRequest}>{selectedItem.pr}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonClose} onPress={closeModal}>
                <Text style={styles.textStyle}>Close</Text>
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

export default UTXOList;
