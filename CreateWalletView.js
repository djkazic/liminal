import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Button } from 'react-native';
import { NativeModules } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from './AuthContext';
import { InitContext } from './InitContext';
import { ThemeContext } from './ThemeContext';

const CreateWalletView = () => {
  const navigation = useNavigation();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [inputValue, setInputValue] = useState(seedPhrase);
  const [lockedInSeed, setLockedInSeed] = useState(false);
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const { isWalletInitialized, setIsWalletInitialized } =
    useContext(InitContext);
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const createWallet = async () => {
    try {
      const seed = await NativeModules.LndModule.genSeed();
      setSeedPhrase(seed);
      setInputValue(seed);
    } catch (error) {
      console.error('Error genseed:', error);
      // setTimeout(createWallet, 500);
    }
  };

  const initWallet = async () => {
    setLockedInSeed(true);
    try {
      await NativeModules.LndModule.initWallet(seedPhrase, false, '');
      setIsAuthenticated(true);
      setIsWalletInitialized(true);
      setTimeout(() => {
        navigation.navigate('Home');
      }, 2000);
    } catch (error) {
      console.error('Error initwallet:', error);
    }
  };

  useEffect(() => {
    createWallet();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={{ flex: 1, marginTop: 20 }}>
        <Text style={[styles.message, { color: textColor }]}>
          This is your 24 word seed phrase. Keep it safe! This will not be shown
          again.
        </Text>
        <TextInput
          style={[
            styles.seedInput,
            { color: textColor },
          ]}
          value={inputValue}
          multiline
          onChangeText={text => setInputValue(seedPhrase)}
          selectTextOnFocus={false}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="I have backed up my seed"
          onPress={initWallet}
          disabled={!seedPhrase || seedPhrase.length === 0 || lockedInSeed}
        />
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
    color: '#E24C53',
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

export default CreateWalletView;
