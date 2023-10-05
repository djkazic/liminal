import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  NativeModules,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';

const RestoreWalletView = () => {
  const navigation = useNavigation();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [multiChanBackup, setMultiChanBackup] = useState('');
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const selectFile = async () => {
    try {
      console.log('Opening file picker for channel backup');
      const resultArray = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      const result = resultArray[0];
      console.log('File picker result:', result);
      const fileBase64 = await RNFS.readFile(result.uri, 'base64');
      console.log('File picker base64:', fileBase64);
      setMultiChanBackup(fileBase64);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('File not selected');
      } else {
        console.error('Unknown Error:', error);
      }
    }
  };

  const restoreWallet = async () => {
    try {
      await NativeModules.LndModule.initWallet(
        seedPhrase,
        true,
        multiChanBackup
      );
      await AsyncStorage.setItem('recovering', JSON.stringify(true));
      await AsyncStorage.setItem('walletInitialized', JSON.stringify(true));
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error initwallet:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={{ flex: 1, marginTop: 20 }}>
        <Text style={[styles.message, { color: textColor }]}>
          Enter your 24 word seed phrase and channel backup file (if you have
          one).
        </Text>
        <TextInput
          style={[styles.seedInput, { color: textColor }]}
          value={seedPhrase}
          multiline
          onChangeText={text => setSeedPhrase(text)}
        />
        <Button title="Select File" onPress={selectFile} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Restore wallet" onPress={restoreWallet} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  message: {
    marginBottom: 20,
    fontSize: 18,
    color: 'red',
  },
  seedInput: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    fontSize: 16,
    height: 150,
  },
  buttonContainer: {
    marginBottom: 20,
  },
});

export default RestoreWalletView;
