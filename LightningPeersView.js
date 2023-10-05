import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

const LightningPeersView = () => {
  const [peers, setPeers] = useState([
    { id: '1', name: 'Node1' },
    { id: '2', name: 'Node2' },
    // Add more peers as needed
  ]);

  const disconnectPeer = peerId => {
    console.log('Disconnecting peer with id:', peerId);
    // Implement the disconnect logic here
    // For now, let’s just filter out the peer from the list
    const updatedPeers = peers.filter(peer => peer.id !== peerId);
    setPeers(updatedPeers);
  };

  return (
    <FlatList
      data={peers}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.peerItem}>
          <Text style={styles.peerName}>{item.name}</Text>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={() => disconnectPeer(item.id)}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  peerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
  },
  peerName: {
    fontSize: 18,
  },
  disconnectButton: {
    backgroundColor: '#E24C53',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default LightningPeersView;
