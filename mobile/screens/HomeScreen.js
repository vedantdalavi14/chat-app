import React, { useEffect, useState, useCallback } from 'react';
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
import socket from '../socket';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

const API_URL = 'http://192.168.1.8:5000';

const formatTimestamp = (date) => {
  if (!date) return '';
  const messageDate = new Date(date);
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const HomeScreen = ({ navigation, authContext }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Wrap fetchUsers in useCallback to prevent it from being recreated on every render
  const fetchUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await axios.get(`${API_URL}/users`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        // Sort users by the most recent message
        const sortedUsers = response.data.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      Alert.alert('Error', 'Could not fetch users.');
    }
  }, []);

  // useFocusEffect runs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  useEffect(() => {
    // This effect runs once to set up socket listeners
    const handleUsersOnline = (onlineUserIds) => setOnlineUsers(new Set(onlineUserIds));
    const handleUserConnected = (userId) => setOnlineUsers((prev) => new Set(prev).add(userId));
    const handleUserDisconnected = (userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    // This handles real-time updates for incoming messages
    const handleNewMessage = (newMessage) => {
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user => {
          // Update the last message if the user is the sender or receiver
          if (user._id === newMessage.sender || user._id === newMessage.receiver) {
            return { ...user, lastMessage: newMessage };
          }
          return user;
        });
        // Sort again to bring the latest conversation to the top
        return updatedUsers.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });
      });
    };

    socket.on('users:online', handleUsersOnline);
    socket.on('user:connected', handleUserConnected);
    socket.on('user:disconnected', handleUserDisconnected);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:connected', handleUserConnected);
      socket.off('user:disconnected', handleUserDisconnected);
      socket.off('message:new', handleNewMessage);
    };
  }, []);

  const handleLogout = () => {
    authContext.signOut();
  };

  const renderUser = ({ item }) => {
    const isOnline = onlineUsers.has(item._id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.navigate('Chat', { userId: item._id, username: item.username })}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}></View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage ? item.lastMessage.content : 'No messages yet'}
          </Text>
        </View>
        {item.lastMessage && (
            <Text style={styles.timestamp}>
                {formatTimestamp(item.lastMessage.createdAt)}
            </Text>
        )}
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
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  }
});

export default HomeScreen;
