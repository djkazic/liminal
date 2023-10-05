import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';

const ContactsBook = () => {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [label, setLabel] = useState('');
  const [lnAddress, setLnAddress] = useState('');
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const handleContactSelect = contact => {
    navigation.goBack();
    navigation.navigate('Send', {
      selectedLNAddress: contact.lnAddress,
    });
  };

  const saveContacts = async updatedContacts => {
    try {
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('Failed to save the contacts to the storage');
    }
  };

  const loadContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem('contacts');
      if (storedContacts !== null) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error('Failed to load the contacts from the storage');
    }
  };

  const addContact = () => {
    if (label && lnAddress) {
      const newContact = { label, lnAddress };
      setContacts(prevContacts => {
        const updatedContacts = [...prevContacts, newContact];
        saveContacts(updatedContacts);
        return updatedContacts;
      });
      setLabel('');
      setLnAddress('');
    } else {
      alert('Both label and LN address are required!');
    }
  };

  const removeContact = contact => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.label}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            setContacts(prevContacts => {
              const updatedContacts = prevContacts.filter(c => c !== contact);
              saveContacts(updatedContacts);
              return updatedContacts;
            });
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return (
    <View style={{ padding: 20, backgroundColor: backgroundColor }}>
      <TextInput
        style={{
          borderColor: 'gray',
          borderWidth: 1,
          marginBottom: 10,
          padding: 5,
          color: textColor,
        }}
        placeholder="Label"
        placeholderTextColor={textColor}
        value={label}
        onChangeText={setLabel}
      />
      <TextInput
        style={{
          borderColor: 'gray',
          borderWidth: 1,
          marginBottom: 20,
          padding: 5,
          color: textColor,
        }}
        placeholder="Lightning Address"
        placeholderTextColor={textColor}
        value={lnAddress}
        onChangeText={setLnAddress}
      />
      <Button title="Add Contact" onPress={addContact} />

      <FlatList
        data={contacts}
        keyExtractor={item => item.label}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleContactSelect(item)}
            onLongPress={() => removeContact(item)}
          >
            <Text style={{ marginTop: 10, color: textColor }}>
              {item.label}: {item.lnAddress}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ContactsBook;
