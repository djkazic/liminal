import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { PayModeContext } from './PayModeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';

const SendView = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { payMode } = useContext(PayModeContext);
  const [invoice, setInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentResult, setPaymentResult] = useState('');
  const [paymentTime, setPaymentTime] = useState({
    start: null,
    end: null,
    total: null,
  });
  const [address, setAddress] = useState('');
  const [feeRate, setFeeRate] = useState('');
  const [hourFee, setHourFee] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const openContactsBook = () => {
    navigation.navigate('Contacts Book');
  };

  const stripLightningPrefix = str => {
    const prefix = 'lightning:';
    if (str.toLowerCase().startsWith(prefix.toLowerCase())) {
      return str.slice(prefix.length);
    } else {
      return str.toLowerCase();
    }
  };

  const generateCallbackUrl = (lnAddress, amountInSats) => {
    if (typeof lnAddress !== 'string' || !lnAddress.includes('@')) {
      throw new Error('Invalid Lightning Address format');
    }
    amountInSats = Number(amountInSats) * 1000;
    if (typeof amountInSats !== 'number' || amountInSats < 1000) {
      throw new Error('Invalid amount');
    }
    const [username, domain] = lnAddress.split('@');
    const genUrl = `https://${domain}/.well-known/lnurlp/${username}`;
    return genUrl;
  };

  const isLNAddress = str => {
    if (typeof str !== 'string') {
      return false;
    }
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(str);
  };

  const scan = async () => {
    try {
      const result = await request(PERMISSIONS.ANDROID.CAMERA);
      if (result === RESULTS.GRANTED) {
        console.log('Camera permissions granted');
        navigation.navigate('Scanner', { onQRCodeScanned });
      } else {
        console.log('Camera permissions denied');
      }
    } catch (error) {
      console.log('Camera permissions request error:', error);
    }
  };

  const onQRCodeScanned = code => {
    if (payMode === 'lightning') {
      setPaymentResult('');
      if (isLNAddress(code)) {
        console.log('Trying to parse scanned LN address ' + code);
        setInvoice(code);
      } else {
        console.log('Scanned regular invoice');
        code = stripLightningPrefix(code);
      }
      setInvoice(code);
    } else if (payMode === 'onchain') {
      setAddress(code);
    }
  };

  const pay = async () => {
    setIsPaying(true);
    setPaymentResult('Attempting to send ' + payMode + ' payment');
    if (payMode === 'lightning') {
      await payInvoice();
    } else if (payMode === 'onchain') {
      await payOnchain();
    }
    setIsPaying(false);
  };

  const payOnchain = async () => {
    try {
      const parsedAmount = parseInt(amount, 10);
      const parsedFeeRate = parseInt(feeRate, 10);
      if (isNaN(parsedAmount) || isNaN(parsedFeeRate)) {
        console.log('Invalid amount or fee rate');
        setPaymentResult('Payment failed due to invalid amount or fee rate.');
        return;
      }
      const txid = await NativeModules.LndModule.sendCoins(
        address,
        parsedAmount,
        parsedFeeRate
      );
      setPaymentResult('Payment broadcasted: ' + txid);
    } catch (error) {
      console.log('Error paying onchain:', error);
      setPaymentResult('Payment failed. ' + error);
    }
  };

  const payInvoice = async () => {
    let finalInvoice = '';
    if (isLNAddress(invoice)) {
      console.log('Getting LN address invoice for ' + amount);
      const addressCallback = generateCallbackUrl(invoice, amount);
      const finalAmount = Number(amount) * 1000;
      const finalUrl = addressCallback + '?amount=' + finalAmount;
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      finalResponse = await response.json();
      finalInvoice = finalResponse.pr;
    } else {
      console.log('Detected normal LN invoice');
      finalInvoice = stripLightningPrefix(invoice);
    }
    try {
      setPaymentTime(prev => ({ ...prev, start: Date.now() }));
      await NativeModules.LndModule.sendPayment(finalInvoice);
    } catch (error) {
      console.log('Error paying invoice:', error);
      setPaymentResult('Payment failed. ' + error);
    }
  };

  const decodeInvoice = async () => {
    if (!invoice.toLowerCase().includes('lnbc')) {
      return;
    }
    try {
      const decodeResult = await NativeModules.LndModule.decodeInvoice(invoice);
      setAmount(decodeResult.amount);
      setDescription(decodeResult.memo);
    } catch (error) {
      console.log('Error decoding invoice:', error);
    }
  };

  const fetchFee = async () => {
    try {
      const response = await fetch(
        'https://mempool.space/api/v1/fees/recommended'
      );
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      const data = await response.json();
      const hourFee = data.hourFee;
      console.log('Hour fee rate:', hourFee);
      setHourFee(hourFee);
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error
      );
    }
  };

  useEffect(() => {
    if (invoice) {
      decodeInvoice(invoice);
    } else {
      fetchFee();
    }
  }, [invoice, address]);

  useEffect(() => {
    if (route.params?.selectedLNAddress) {
      setInvoice(route.params.selectedLNAddress);
    }
  }, [route.params?.selectedLNAddress]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'PaymentUpdate',
      update => {
        console.log('Received PaymentUpdate: ', update);
        setPaymentResult('Payment state: ' + update.state);
        if (update.state == 'succeeded') {
          setPaymentTime(prev => ({
            ...prev,
            end: Date.now(),
            total: Date.now() - prev.start,
          }));
        }
      }
    );

    return () => {
      console.log('Tearing down PaymentUpdate subscription');
      subscription.remove();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {payMode === 'lightning' ? (
        <Text style={{ paddingBottom: 6, color: textColor }}>Lightning</Text>
      ) : (
        <Text style={{ paddingBottom: 6, color: textColor }}>Onchain</Text>
      )}
      <ScrollView>
        <View style={styles.formContent}>
          {payMode === 'lightning' && (
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={invoice}
                onChangeText={setInvoice}
                placeholder="Invoice or LN address"
                placeholderTextColor={textColor}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 10, top: 3 }}
                onPress={scan}
              >
                <Icon name="camera-outline" color={textColor} size={32} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openContactsBook}
                style={{
                  position: 'absolute',
                  color: textColor,
                  right: 50,
                  top: 6,
                }}
              >
                <Icon name="person-outline" size={26} color={textColor} />
              </TouchableOpacity>
            </View>
          )}

          {payMode === 'onchain' && (
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={textColor}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 10, top: 3 }}
                onPress={scan}
              >
                <Icon name="camera-outline" size={32} color={textColor} />
              </TouchableOpacity>
            </View>
          )}

          {payMode === 'lightning' && invoice != '' ? (
            <View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>Amount</Text>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount in sats"
                  placeholderTextColor={textColor}
                  keyboardType="numeric"
                  editable={isLNAddress(invoice)}
                />
              </View>

              {invoice != '' && invoice.toLowerCase().includes('lnbc') && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: textColor }]}>
                    Description
                  </Text>
                  <TextInput
                    style={[styles.input, { color: textColor }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Description"
                    placeholderTextColor={textColor}
                    editable={false}
                  />
                </View>
              )}

              {paymentResult != '' && (
                <View style={styles.paymentResult}>
                  <Text style={{ color: textColor }}>{paymentResult}</Text>
                  {paymentTime.total != null ? (
                    <Text style={{ color: textColor }}>
                      Time to pay: {paymentTime.total} ms
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          {payMode === 'onchain' ? (
            <View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>Amount</Text>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount in sats"
                  placeholderTextColor={textColor}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Fee rate (sat/vB)
                </Text>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={feeRate}
                  onChangeText={setFeeRate}
                  placeholder={hourFee.toString() + ' sat/vB for 1 hr'}
                  placeholderTextColor={textColor}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.paymentResult}>
                <Text style={{ color: textColor }}>{paymentResult}</Text>
                {isPaying && <ActivityIndicator size="small" color="#00ff00" />}
                {payMode === 'lightning' && paymentTime.total != null ? (
                  <Text style={{ color: textColor }}>
                    Time to pay: {paymentTime.total} ms
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button
          color="#E24C53"
          style={styles.button}
          title={payMode === 'lightning' ? 'Pay Invoice' : 'Send Onchain'}
          onPress={pay}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContent: {},
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    fontSize: 18,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    color: '#282828',
  },
  buttonContainer: {},
  button: {
    backgroundColor: '#E24C53',
  },
  paymentResult: {
    marginBottom: 20,
  },
});

export default SendView;
