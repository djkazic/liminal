import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
} from 'react-native';
import SendReceiveButtons from './SendReceiveButtons';
import TransactionsList from './TransactionsList';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import useDataFetching from './hooks/DataFetching';
import RNFS from 'react-native-fs';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { BackHandler } from 'react-native';
import { AppState } from 'react-native';
import { InitContext } from './InitContext';
import { AuthContext } from './AuthContext';
import { ThemeContext } from './ThemeContext';
import { formatNumber, macaroonExists } from './Utils';

const MainScreen = () => {
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : '#282828';
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const { isWalletInitialized, setIsWalletInitialized } =
    useContext(InitContext);
  const navigation = useNavigation();
  const [recovery, setRecovery] = useState(false);
  const [recoveryFinished, setRecoveryFinished] = useState(false);
  const [wasInBackground, setWasInBackground] = useState(false);
  const [balance, setBalance] = useState('0');
  const [onchainBalance, setOnchainBalance] = useState('0');
  const [pendingBalance, setPendingBalance] = useState('0');
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const logFilePath = RNFS.DocumentDirectoryPath + '/app_logs.txt';

  const checkWalletInitialized = async () => {
    try {
      const walletInit = await macaroonExists();
      if (!walletInit) {
        navigation.navigate('Setup');
      } else {
        const isRunning = await NativeModules.LndModule.isRunning();
        if (!isRunning) {
          navigation.navigate('Rapid Gossip Sync');
        } else {
          navigation.navigate('Home');
        }
      }
      setIsWalletInitialized(walletInit);
    } catch (error) {
      console.log('Failed to get wallet status', error);
    }
  };

  const checkWalletAuth = async () => {
    const walletInit = await macaroonExists();
    setIsWalletInitialized(walletInit);
    if (walletInit && !isAuthenticated) {
      handleBiometricAuth();
    }
  };

  const getBalancesAndRecovery = async () => {
    const macaroonPresent = await macaroonExists();
    if (!macaroonPresent) {
      return;
    }
    getBalances();
    getRecoveryInfo();
  };

  const getBalances = async () => {
    // console.log('getbalances');
    try {
      const balance = await NativeModules.LndModule.getLightningBalance();
      const onchainBalance = await NativeModules.LndModule.getOnchainBalance();
      setBalance(balance);
      setOnchainBalance(onchainBalance.confirmedBalance);
      setPendingBalance(onchainBalance.unconfirmedBalance);
    } catch (error) {
      console.log('Failed to get wallet balances', error);
    }
  };

  const getRecoveryInfo = async () => {
    try {
      const recoveryInfo = await NativeModules.LndModule.getRecoveryInfo();
      setRecovery(recoveryInfo.recoveryMode);
      setRecoveryFinished(recoveryInfo.recoveryFinished);
      setRecoveryProgress(recoveryInfo.progress * 100);
    } catch (error) {
      console.log('Failed to get recovery info', error);
    }
  };

  const handleBiometricAuth = () => {
    console.log('handlebiometrics');
    const rnBiometrics = new ReactNativeBiometrics();
    rnBiometrics
      .isSensorAvailable()
      .then(resultObject => {
        const { biometryType, available } = resultObject;
        if (available && biometryType == BiometryTypes.Biometrics) {
          rnBiometrics
            .simplePrompt({
              promptMessage: 'Confirm fingerprint',
              fallback: 'device',
            })
            .then(authResult => {
              if (authResult.error !== 'User cancellation') {
                setIsAuthenticated(authResult.success);
              } else {
                console.log('Cancelled authentication');
                setIsAuthenticated(false);
                BackHandler.exitApp();
              }
            })
            .catch(error => {
              console.log('Authentication failed', error);
            });
        } else {
          console.log('Biometrics not supported');
          setIsAuthenticated(true);
        }
      })
      .catch(error => {
        console.log('Error checking biometric availability', error);
      });
  };

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.join(' ');
      RNFS.appendFile(logFilePath, `LOG: ${message}\n`, 'utf8');
      originalLog(...args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      RNFS.appendFile(logFilePath, `WARN: ${message}\n`, 'utf8');
      originalWarn(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      RNFS.appendFile(logFilePath, `ERROR: ${message}\n`, 'utf8');
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    console.log('isAuthenticated changed:', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      setAppState(nextAppState);
    };
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if (AppState.removeEventListener) {
        AppState.removeEventListener('change', handleAppStateChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'background') {
        setWasInBackground(true);
        setTimeout(() => {
          navigation.navigate('Home');
          setIsAuthenticated(false);
        }, 500);
      } else if (nextAppState === 'active' && wasInBackground) {
        setWasInBackground(false);
        checkWalletAuth();
      }
    };
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => {
      appStateSubscription.remove();
    };
  }, [isAuthenticated]);

  useDataFetching(getBalancesAndRecovery, 1000);
  useFocusEffect(
    React.useCallback(() => {
      const executeAsyncOperations = async () => {
        await checkWalletInitialized();
        await getBalancesAndRecovery();
        await checkWalletAuth();
        // console.log(appState);
      };
      executeAsyncOperations();
    }, [isAuthenticated])
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {recovery && !recoveryFinished && (
        <Text style={{ alignSelf: 'center', color: { textColor } }}>
          Recovery in progress -- keep liminal awake! {recoveryProgress}%
          complete
        </Text>
      )}
      {isWalletInitialized && isAuthenticated ? (
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Channel List')}>
            <Text
              style={{
                fontSize: 30,
                alignSelf: 'center',
                color: textColor,
              }}
            >
              ⚡ {formatNumber(balance)} sats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('UTXO List')}>
            <Text
              style={{
                fontSize: 30,
                alignSelf: 'center',
                color: textColor,
              }}
            >
              ⛓️ {formatNumber(onchainBalance)} sats
            </Text>
            {pendingBalance != '0' && (
              <Text style={{ color: textColor, alignSelf: 'center' }}>
                ⏳ ({formatNumber(pendingBalance)} sats pending)
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.transactionsListContainer}>
            <TransactionsList />
          </View>
          <View style={styles.buttonsContainer}>
            <SendReceiveButtons />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  transactionsListContainer: {
    flex: 4,
    marginBottom: 85,
    paddingBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
});

export default MainScreen;
