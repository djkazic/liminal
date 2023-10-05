import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeModules,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { ThemeContext } from './ThemeContext';

const ReceiveView = () => {
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [expiration, setExpiration] = useState('3600');
  const [routeHints, setRouteHints] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const copyToClipboard = () => {
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

  const createInvoice = async () => {
    const paymentRequest = await NativeModules.LndModule.addInvoice(
      memo,
      amount.toString(),
      expiration.toString()
    );
    setPaymentRequest(paymentRequest);
  };

  const getOnchainAddress = async () => {
    const onchainAddress = await NativeModules.LndModule.newAddress();
    setPaymentRequest(onchainAddress);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {paymentRequest ? (
        <View style={styles.qrContainer}>
          <View style={{ backgroundColor: 'white', padding: 20 }}>
            <QRCode value={paymentRequest} size={200} />
          </View>
          <TouchableOpacity onPress={copyToClipboard}>
            <Text style={[styles.paymentRequest, { color: textColor }]}>
              {paymentRequest}
            </Text>
          </TouchableOpacity>
          <Toast />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Memo</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: textColor,
                    borderColor: textColor,
                  },
                ]}
                value={memo}
                onChangeText={setMemo}
                placeholder="Description"
                placeholderTextColor={textColor}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Amount</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor, borderColor: textColor },
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="Amount in sats"
                placeholderTextColor={textColor}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Expiration
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor, borderColor: textColor },
                ]}
                value={expiration}
                onChangeText={setExpiration}
                placeholder="Expiration in seconds"
                placeholderTextColor={textColor}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Route Hints
              </Text>
              <Switch
                value={routeHints}
                onValueChange={setRouteHints}
                thumbColor={routeHints ? '#f5dd4b' : '#f4f3f4'}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
              />
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <Button
              color="#57D272"
              style={styles.button}
              title="Create Invoice"
              onPress={createInvoice}
            />
          </View>
          <View>
            <Button
              color="orange"
              style={styles.button}
              title="Get Onchain Address"
              onPress={getOnchainAddress}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formContent: {},
  label: {
    marginBottom: 10,
    fontSize: 16,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#57D272',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
  },
  paymentRequest: {
    marginVertical: 20,
    fontSize: 16,
  },
});

export default ReceiveView;
