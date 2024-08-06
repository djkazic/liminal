import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, NativeModules } from 'react-native';
import SendReceiveButtons from './SendReceiveButtons';
// import TransactionsList from './TransactionsList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import UTXOList from './UTXOList';
import useDataFetching from './hooks/DataFetching';
import { ThemeContext } from './ThemeContext';
import { formatNumber } from './Utils';

const UTXOScreen = () => {
  // const navigation = useNavigation();
  const [onchainBalance, setOnchainBalance] = useState('0');
  const [pendingBalance, setPendingBalance] = useState('0');
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const getBalance = async () => {
    // console.log('getbalances');
    try {
      const onchainBalance = await NativeModules.LndModule.getOnchainBalance();
      setOnchainBalance(onchainBalance.confirmedBalance);
      setPendingBalance(onchainBalance.unconfirmedBalance);
    } catch (error) {
      console.log('Failed to get onchain wallet balance', error);
    }
  };

  useDataFetching(getBalance, 1000);
  useFocusEffect(
    React.useCallback(() => {
      getBalance();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 32, alignSelf: 'center', color: textColor }}>
          ⛓️ {onchainBalance} sats
        </Text>
        {pendingBalance != '0' && (
          <Text style={{ color: textColor, alignSelf: 'center' }}>
            ⏳ ({formatNumber(pendingBalance)} sats pending)
          </Text>
        )}
        <View style={styles.utxoListContainer}>
          <React.StrictMode>
            <UTXOList />
          </React.StrictMode>
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
  utxoListContainer: {
    flex: 4,
    marginBottom: 85,
    paddingBottom: 20,
  },
});

export default UTXOScreen;
