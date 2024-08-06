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
import { formatNumber } from './Utils';
import { ThemeContext } from './ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

const TransactionsList = () => {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const textColor = isDarkTheme ? 'white' : '#282828';
  const [transactions, setTransactions] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // const [previousTransactions, setPreviousTransactions] = useState(null);

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

  const getAndSortTransactions = async () => {
    try {
      // console.log('getandsorttransactions');
      const [payments, invoices, chainTxs] = await Promise.all([
        NativeModules.LndModule.listPayments(),
        NativeModules.LndModule.listInvoices(),
        NativeModules.LndModule.getTransactions(),
      ]);
      // console.log(JSON.stringify(chainTxs));
      const paymentsArray = payments ? payments : [];
      const invoicesArray = invoices ? invoices : [];
      const chainTxArray = chainTxs ? chainTxs : [];
      const transactions = [
        ...paymentsArray,
        ...invoicesArray,
        ...chainTxArray,
      ];
      // console.log(JSON.stringify(chainTxArray));
      // Sort the transactions array by the createdTime field, descending order (newest to oldest)
      transactions.sort((a, b) => b.creationDate - a.creationDate);
      setTransactions(transactions);
    } catch (error) {
      console.log('Error fetching transactions:', error);
    }
  };

  useDataFetching(getAndSortTransactions, 1000);
  useFocusEffect(
    React.useCallback(() => {
      getAndSortTransactions();
    }, [])
  );

  return (
    <>
      <FlatList
        contentContainerStyle={{ paddingBottom: 20 }}
        style={[styles.container, { flex: 1 }]}
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const date = new Date(item.creationDate * 1000);
          const formattedDate = `${
            date.getMonth() + 1
          }/${date.getDate()} ${date.getHours()}:${date
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
          const isExpired = item.creationDate + item.expiry < Date.now() / 1000;
          let label = item.label;
          if (item.label && label.includes('openchannel')) {
            label = 'Channel open';
          } else if (item.label && label.includes('closechannel')) {
            label = 'Channel close';
          }
          const isLightning = item.type == 'invoice' || item.type == 'payment';
          let confs = '';
          if (item.confs == 0) {
            confs = '(pending)';
          }
          return (
            <TouchableOpacity onPress={() => openModal(item)}>
              <View style={styles.transactionItem}>
                {isLightning ? (
                  <Text style={{ color: textColor }}>
                    ⚡ {formattedDate}{' '}
                    {item.memo && item.memo.length > 10
                      ? item.memo.substring(0, 10) + '...'
                      : item.memo}
                    {item.type === 'invoice' && !item.settled && (
                      <Text> (pending)</Text>
                    )}
                  </Text>
                ) : (
                  <Text style={{ color: textColor }}>
                    ⛓️ {formattedDate} {label}
                  </Text>
                )}
                {isExpired ? (
                  <Text style={{ color: '#E24C53' }}>(expired)</Text>
                ) : null}
                <Text style={{ color: textColor }}>{confs}</Text>
                <Text
                  style={[
                    styles.amount,
                    (item.type == 'invoice' || !item.type) && item.value >= 0
                      ? styles.greenText
                      : styles.redText,
                  ]}
                >
                  {formatNumber(Math.abs(item.value))} sats
                </Text>
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
              <Text style={styles.modalTitle}>
                {selectedItem.type ? 'Lightning ' : 'Onchain '}
                {(selectedItem.type === 'invoice' || !selectedItem.type) &&
                selectedItem.value >= 0
                  ? 'Invoice'
                  : 'Payment'}
              </Text>
              {selectedItem.pr ? (
                <QRCode
                  value={selectedItem.pr}
                  size={200}
                  style={{ paddingBottom: 10 }}
                />
              ) : (
                <QRCode
                  value={selectedItem.id}
                  size={200}
                  style={{ paddingBottom: 10 }}
                />
              )}
              {(() => {
                const date = new Date(selectedItem.creationDate * 1000);
                const formattedDate = `${
                  date.getMonth() + 1
                }/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`;
                const isExpired =
                  selectedItem.creationDate + selectedItem.expiry <
                  Date.now() / 1000;
                const isLightning =
                  selectedItem.type == 'invoice' ||
                  selectedItem.type == 'payment';
                const CenteredText = ({ children }) => (
                  <Text style={{ textAlign: 'center' }}>{children}</Text>
                );

                return (
                  <View style={{ marginTop: 10, justifyContent: 'center' }}>
                    {isLightning ? (
                      <View>
                        <CenteredText>{formattedDate}</CenteredText>
                        <CenteredText>
                          Description: {selectedItem.memo}
                        </CenteredText>
                        <CenteredText>{selectedItem.value} sats</CenteredText>
                        {isExpired ? (
                          <Text
                            style={{ color: '#E24C53', textAlign: 'center' }}
                          >
                            (expired)
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View>
                        <CenteredText>{formattedDate}</CenteredText>
                        {selectedItem.label ? (
                          <CenteredText>{selectedItem.label}</CenteredText>
                        ) : null}
                        <CenteredText>
                          {Math.abs(selectedItem.value)} sats
                        </CenteredText>
                        <CenteredText style={{ color: textColor }}>
                          {selectedItem.confs} confs
                        </CenteredText>
                      </View>
                    )}
                  </View>
                );
              })()}
              {selectedItem.type == 'invoice' ||
              selectedItem.type == 'payment' ? (
                <TouchableOpacity
                  onPress={() => copyToClipboard(selectedItem.pr)}
                >
                  <Text style={styles.paymentRequest}>{selectedItem.pr}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(selectedItem.id)}
                  >
                    <Text style={styles.paymentRequest}>{selectedItem.id}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(selectedItem.rawHex)}
                  >
                    <Text style={styles.paymentRequest}>Click to copy raw tx hex</Text>
                  </TouchableOpacity>
                </>
              )}
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

export default TransactionsList;
