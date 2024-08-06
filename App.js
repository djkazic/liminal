import React, { useContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, NativeModules } from 'react-native';
import ContactsBook from './ContactsBook';
import MainScreen from './MainScreen';
import LogScreen from './LogScreen';
import ReceiveView from './ReceiveView';
import SendView from './SendView';
import SettingsView from './SettingsView';
import OpenChannelView from './OpenChannelView';
import SetupView from './SetupView';
import CreateWalletView from './CreateWalletView';
import RestoreWalletView from './RestoreWalletView';
import UTXOScreen from './UTXOScreen';
import ChannelScreen from './ChannelScreen';
import ScanScreen from './ScanScreen';
import LoadingScreen from './LoadingScreen';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import useDataFetching from './hooks/DataFetching';
import { AuthContext, AuthProvider } from './AuthContext';
import { InitProvider } from './InitContext';
import { PayModeContext, PayModeProvider } from './PayModeContext';
import { ThemeContext, ThemeProvider } from './ThemeContext';
import { PermissionsAndroid, Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { macaroonExists } from './Utils';

const Stack = createStackNavigator();

function HeaderButtons({ style }) {
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const { payMode, setPayMode } = useContext(PayModeContext);
  const navigation = useNavigation();
  const route = useRoute();
  const [chainSyncStatus, setChainSyncStatus] = useState('error');
  const [graphSyncStatus, setGraphSyncStatus] = useState('error');
  const { isDarkTheme, setIsDarkTheme, toggleTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const isMainPage = route.name === 'Home';
  const isSendPage = route.name === 'Send';

  const channelId = '1337';

  const getSyncIcon = status => {
    switch (status) {
      case 'active':
        return { name: 'sync', color: isDarkTheme ? 'white' : 'black' };
      case 'synced':
        return { name: 'checkmark-circle', color: 'green' };
      case 'error':
        return { name: 'close-circle', color: 'red' };
      default:
        return { name: 'help-circle', color: 'grey' };
    }
  };

  const getSyncIconSize = iconName => {
    switch (iconName) {
      case 'sync':
        return 19;
      default:
        return 20;
    }
  };

  const getInfo = async () => {
    const macaroonPresent = await macaroonExists();
    if (!macaroonPresent) {
      return;
    }
    // console.log('getinfo');
    try {
      const syncedMap = await NativeModules.LndModule.getInfo();
      if (syncedMap.syncedChain) {
        setChainSyncStatus('synced');
      } else {
        setChainSyncStatus('active');
      }
      if (syncedMap.syncedGraph) {
        setGraphSyncStatus('synced');
      } else {
        setGraphSyncStatus('active');
      }
    } catch (error) {
      console.log('Failed to getinfo', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.Version >= 30) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permissions',
            message: 'Your permission is required to display notifications',
            buttonNeutral: 'Ask me later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true;
    }
  };

  const startService = async () => {
    await requestPermissions();
    notifee.registerForegroundService(notification => {
      return new Promise(() => {});
    });
    const channelId = await notifee.createChannel({
      id: 'liminal',
      name: 'Liminal Service',
    });
    notifee.displayNotification({
      title: 'liminal wallet',
      body: '',
      android: {
        smallIcon: 'ic_small_icon',
        channelId,
        asForegroundService: true,
        colorized: false,
        ongoing: true,
      },
    });
  };

  useDataFetching(getInfo, 1000);
  useFocusEffect(
    React.useCallback(() => {
      startService();
      getInfo();
    }, [])
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        marginRight: 10,
        backgroundColor: style.backgroundColor,
      }}
    >
      {isMainPage && isAuthenticated && (
        <>
          <Text style={{ paddingRight: 6, color: textColor }}>CH</Text>
          <Icon
            name={getSyncIcon(chainSyncStatus).name}
            size={getSyncIconSize(getSyncIcon(chainSyncStatus).name)}
            color={getSyncIcon(chainSyncStatus).color}
            style={{ marginRight: 4 }}
          />
          <Text style={{ paddingRight: 4, color: textColor }}>LN</Text>
          <Icon
            name={getSyncIcon(graphSyncStatus).name}
            size={getSyncIconSize(getSyncIcon(graphSyncStatus).name)}
            color={getSyncIcon(graphSyncStatus).color}
            style={{ marginRight: 10 }}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Open Channel')}>
            <Text style={{ marginLeft: 2, marginRight: 19, color: textColor }}>✨</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Logs')}>
            <Text style={{ marginRight: 20, color: textColor }}>📜</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={{ marginRight: 10, color: textColor }}>⚙️</Text>
          </TouchableOpacity>
        </>
      )}

      {isSendPage && isAuthenticated && (
        <>
          <TouchableOpacity
            onPress={() =>
              setPayMode(payMode === 'onchain' ? 'lightning' : 'onchain')
            }
          >
            <Text style={{ marginRight: 10, fontSize: 21 }}>
              {payMode === 'onchain' ? <Text>⛓️</Text> : <Text>⚡</Text>}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Content />
    </ThemeProvider>
  );
}

function Content() {
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';
  const NavTheme = {
    dark: isDarkTheme,
    colors: { background: backgroundColor },
  };

  return (
    <PayModeProvider>
      <InitProvider>
        <AuthProvider>
          <NavigationContainer theme={NavTheme}>
            <Stack.Navigator
              screenOptions={() => {
                return {
                  headerRight: () => (
                    <HeaderButtons style={{ backgroundColor }} />
                  ),
                  headerTintColor: textColor,
                  headerStyle: { backgroundColor },
                  headerTitleStyle: { color: textColor },
                  cardStyle: {
                    backgroundColor: backgroundColor,
                  },
                  cardShadowEnabled: false,
                };
              }}
            >
              <Stack.Screen name="Home" component={MainScreen} />
              <Stack.Screen
                name="Rapid Gossip Sync"
                component={LoadingScreen}
              />
              <Stack.Screen name="Setup" component={SetupView} />
              <Stack.Screen name="Create Wallet" component={CreateWalletView} />
              <Stack.Screen
                name="Restore Wallet"
                component={RestoreWalletView}
              />
              <Stack.Screen name="Logs" component={LogScreen} />
              <Stack.Screen name="Receive" component={ReceiveView} />
              <Stack.Screen name="Send" component={SendView} />
              <Stack.Screen name="Settings" component={SettingsView} />
              <Stack.Screen name="Open Channel" component={OpenChannelView} />
              <Stack.Screen name="UTXO List" component={UTXOScreen} />
              <Stack.Screen name="Channel List" component={ChannelScreen} />
              <Stack.Screen name="Scanner" component={ScanScreen} />
              <Stack.Screen name="Contacts Book" component={ContactsBook} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </InitProvider>
    </PayModeProvider>
  );
}
