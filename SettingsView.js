import React, { useContext, useState } from 'react';
import {
  Alert,
  View,
  Text,
  Switch,
  TextInput,
  Button,
  StyleSheet,
  NativeModules,
  ScrollView,
} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { ThemeContext } from './ThemeContext';
import notifee from '@notifee/react-native';

const SettingsView = () => {
  const [isSpeedloaderEnabled, setIsSpeedloaderEnabled] = useState(true);
  const [gotNetworkData, setGotNetworkData] = useState(false);
  const [gotResetResult, setGotResetResult] = useState(false);
  const [numZombies, setNumZombies] = useState(0);
  const [numChannels, setNumChannels] = useState(0);
  const [numNodes, setNumNodes] = useState(0);
  const [resetResult, setResetResult] = useState(null);
  const [loopOutQuote, setLoopOutQuote] = useState(null);
  const [loopOutTerms, setLoopOutTerms] = useState(null);
  const [poolAccounts, setPoolAccounts] = useState(null);
  const [poolLeases, setPoolLeases] = useState(null);
  const [poolQuote, setPoolQuote] = useState(null);
  const [bitcoinBackend, setBitcoinBackend] = useState('node.eldamar.icu');
  const { isDarkTheme, setIsDarkTheme, toggleTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const onchainNotification = async () => {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: 'onchain',
      name: 'Onchain',
    });
    await notifee.displayNotification({
      title: 'Received funds onchain',
      body: 'bc1q',
      android: {
        channelId,
        smallIcon: 'ic_small_icon',
        pressAction: {
          id: 'default',
        },
      },
    });
  };

  const onLightningNotification = async () => {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: 'lightning',
      name: 'Lightning',
    });
    await notifee.displayNotification({
      title: 'Received funds on lightning',
      body: 'lnbc',
      android: {
        channelId,
        smallIcon: 'ic_small_icon',
        pressAction: {
          id: 'default',
        },
      },
    });
  };

  const getNodeInfo = () => {
    console.log('Getting node info');
  };

  const getScbBackup = async () => {
    const lndPath = RNFS.DocumentDirectoryPath + "/lnd";
    const filePath = `${lndPath}/data/chain/bitcoin/mainnet/channel.backup`;
    const fileExists = await RNFS.exists(filePath);
    if (fileExists) {
      const shareOptions = {
        url: `file://${filePath}`,
        type: 'application/octet-stream',
      };
      try {
        await Share.open(shareOptions);
      } catch (error) {
        console.log('Error =>', error);
      }
    } else {
      console.log('File does not exist');
    }
  };

  const getAppLogs = async () => {
    const lndPath = RNFS.DocumentDirectoryPath + "/lnd";
    const filePath = `${lndPath}/app_logs.txt`;
    const fileExists = await RNFS.exists(filePath);
    if (fileExists) {
      const shareOptions = {
        url: `file://${filePath}`,
        type: 'application/octet-stream',
      };
      try {
        await Share.open(shareOptions);
      } catch (error) {
        console.log('Error =>', error);
      }
    } else {
      console.log('File does not exist');
    }
  };

  const deleteAppLogs = async () => {
    const lndPath = RNFS.DocumentDirectoryPath + "/lnd";
    const filePath = `${lndPath}/app_logs.txt`;
    const fileExists = await RNFS.exists(filePath);
    if (fileExists) {
      RNFS.unlink(filePath)
        .then(() => {
          console.log('APP LOG DELETED');
        })
        .catch(err => {
          console.error('ERROR DELETING FILE:', err.message);
        });
    }
  };

  const getLndLogs = async () => {
    const lndPath = RNFS.DocumentDirectoryPath + "/lnd";
    const filePath = `${lndPath}/logs/bitcoin/mainnet/lnd.log`;
    const fileExists = await RNFS.exists(filePath);
    if (fileExists) {
      const shareOptions = {
        url: `file://${filePath}`,
        type: 'application/octet-stream',
      };
      try {
        await Share.open(shareOptions);
      } catch (error) {
        console.log('Error =>', error);
      }
    } else {
      console.log('File does not exist');
    }
  };

  const getNetworkInfo = async () => {
    const netInfo = await NativeModules.LndModule.getNetworkInfo();
    setGotNetworkData(true);
    setNumZombies(netInfo.numZombies);
    setNumChannels(netInfo.numChannels);
    setNumNodes(netInfo.numNodes);
  };

  const rescan = async () => {
    Alert.alert(
      'Rescan & restart',
      `Are you sure you want to rescan? This will restart liminal.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            await NativeModules.LndModule.rescan();
          },
        },
      ]
    );
  };

  const forceGossip = async () => {
    Alert.alert(
      'Force gossip & restart',
      `Are you sure you want to force gossip? This will restart liminal.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            await NativeModules.LndModule.forceGossip();
          },
        },
      ]
    );
  };

  const getLoopOutQuote = async () => {
    const loopOutRes = await NativeModules.LoopModule.loopOutQuote();
    setLoopOutQuote(loopOutRes);
  };

  const getLoopOutTerms = async () => {
    const loopOutTermsRes = await NativeModules.LoopModule.loopOutTerms();
    setLoopOutTerms(loopOutTermsRes);
  };

  const getPoolAccounts = async () => {
    const poolAccountsRes = await NativeModules.PoolModule.listAccounts();
    setPoolAccounts(poolAccountsRes);
  }

  const getPoolLeases = async () => {
    const poolLeasesRes = await NativeModules.PoolModule.leases();
    setPoolLeases(poolLeasesRes);
  }

  const getPoolQuote = async () => {
    const poolQuoteRes = await NativeModules.PoolModule.quoteOrderRequest();
    setPoolQuote(`Rate per block: ${poolQuoteRes.ratePerBlock}, ` + 
      `execution fee: ${poolQuoteRes.totalExecutionFee} sats, premium: ${poolQuoteRes.totalPremium} sats, worst case onchain fee: ${poolQuoteRes.worstCaseChainFee}`);
  }

  const resetPathfinding = async () => {
    const resetRes = await NativeModules.LndModule.resetMc();
    setGotResetResult(true);
    if (resetRes == '{}') {
      setResetResult('Reset OK');
    }
  };

  const clearResults = async () => {
    setLoopOutQuote(null);
    setLoopOutTerms(null);
    setPoolAccounts(null);
    setPoolLeases(null);
    setPoolQuote(null);
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* <View style={styles.settingItem}>
        <Text style={styles.label}>Speedloader</Text>
        <Switch
          value={isSpeedloaderEnabled}
          onValueChange={setIsSpeedloaderEnabled}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View> */}

      {/* <View style={styles.settingItem}>
        <Text style={styles.label}>Bitcoin backend</Text>
        <TextInput
          style={styles.input}
          value={bitcoinBackend}
          onChangeText={setBitcoinBackend}
          // placeholder="node.eldamar.icu"
        />
      </View> */}

      {/* <View style={styles.buttonContainer}>
        <Button title="Get Node Info" onPress={getNodeInfo} />
      </View> */}
      <ScrollView>
        <View style={styles.buttonContainer}>
          <Button title="Switch theme (light/dark)" onPress={toggleTheme} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get Network Info" onPress={getNetworkInfo} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Reset Pathfinding" onPress={resetPathfinding} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get channel backup" onPress={getScbBackup} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get app logs" onPress={getAppLogs} />
        </View>

        {/* <View style={styles.buttonContainer}>
          <Button title="Delete app logs" onPress={deleteAppLogs} />
        </View> */}

        <View style={styles.buttonContainer}>
          <Button title="Get LND logs" onPress={getLndLogs} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Rescan & restart" onPress={rescan} />
        </View>

        {/* <View style={styles.buttonContainer}>
          <Button title="Force speedloader & restart" onPress={forceGossip} />
        </View> */}

        <View style={styles.buttonContainer}>
          <Button title="Get Loop out quote" onPress={getLoopOutQuote} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get Loop out terms" onPress={getLoopOutTerms} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get Pool accounts" onPress={getPoolAccounts} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get Pool leases" onPress={getPoolLeases} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Get Pool quote" onPress={getPoolQuote} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Clear results" onPress={clearResults} />
        </View>

        {gotNetworkData && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Network data
            </Text>
            <Text style={{ color: textColor }}>{numChannels} channels</Text>
            <Text style={{ color: textColor }}>{numNodes} nodes</Text>
            <Text style={{ color: textColor }}>{numZombies} zombies</Text>
          </>
        )}

        {resetResult && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Pathfinding reset
            </Text>
            <Text style={{ color: textColor }}>{resetResult}</Text>
          </>
        )}

        {loopOutQuote && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Loop out quote
            </Text>
            <Text style={{ color: textColor }}>{loopOutQuote}</Text>
          </>
        )}

        {loopOutTerms && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Loop out terms
            </Text>
            <Text style={{ color: textColor }}>{loopOutTerms}</Text>
          </>
        )}

        {poolAccounts && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Pool accounts
            </Text>
            <Text style={{ color: textColor }}>{poolAccounts}</Text>
          </>
        )}

        {poolLeases && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Pool leases
            </Text>
            <Text style={{ color: textColor }}>{poolLeases}</Text>
          </>
        )}

        {poolQuote && (
          <>
            <Text style={[styles.boldText, { color: textColor }]}>
              Pool quote
            </Text>
            <Text style={{ color: textColor }}>{poolQuote}</Text>
          </>
        )}
      </ScrollView>
    </View>
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
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    width: '60%',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  boldText: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SettingsView;
