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
import socket from '../socket'; // Import the socket instance

const API_URL = 'http://192.168.1.8:5000';

const HomeScreen = ({ navigation, authContext }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // State to track online users

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await axios.get(`${API_URL}/users`, {
            headers: {
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

    // --- NEW: Listen for online status updates ---
    const handleUsersOnline = (onlineUserIds) => {
      setOnlineUsers(new Set(onlineUserIds));
    };
    const handleUserConnected = (userId) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };
    const handleUserDisconnected = (userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on('users:online', handleUsersOnline);
    socket.on('user:connected', handleUserConnected);
    socket.on('user:disconnected', handleUserDisconnected);

    // Clean up listeners
    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:connected', handleUserConnected);
      socket.off('user:disconnected', handleUserDisconnected);
    };
    // ------------------------------------------

  }, []);

  const handleLogout = () => {
    authContext.signOut();
  };

  const renderUser = ({ item }) => {
    const isOnline = onlineUsers.has(item._id); // Check if the user is in the online set

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.navigate('Chat', { userId: item._id, username: item.username })}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}></View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <Text style={styles.username}>{item.username}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} />
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No other users found.</Text>}
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
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
  },
  onlineDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'green',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  }
});

export default HomeScreen;
