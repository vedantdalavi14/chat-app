import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Button,
  Alert,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.8:5000';

// We need to get the authContext from App.js to handle logout
const HomeScreen = ({ navigation, authContext }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await axios.get(`${API_URL}/users`, {
            headers: {
              // Use the lowercase 'authorization' header
              authorization: `Bearer ${token}`,
            },
          });
          setUsers(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        Alert.alert('Error', 'Could not fetch users.');
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = () => {
    // Call the signOut function from the authContext
    authContext.signOut();
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('Chat', { userId: item._id, username: item.username })}
    >
      <View style={styles.avatar}></View>
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} />
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text>No other users found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
    marginRight: 15,
  },
  username: {
    fontSize: 18,
  },
});

export default HomeScreen;
