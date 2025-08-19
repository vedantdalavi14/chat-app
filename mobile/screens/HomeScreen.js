import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  Platform, // Import Platform
  StatusBar, // Import StatusBar
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socket from '../socket';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.8:5000';

const formatTimestamp = (date) => {
  if (!date) return '';
  const messageDate = new Date(date);
  const now = new Date();
  
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return messageDate.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
};

const HomeScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await axios.get(`${API_URL}/users`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  useEffect(() => {
    const handleUsersOnline = (onlineUserIds) => setOnlineUsers(new Set(onlineUserIds));
    const handleUserConnected = (userId) => setOnlineUsers((prev) => new Set(prev).add(userId));
    const handleUserDisconnected = (userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleNewMessage = (newMessage) => {
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user => {
          if (user._id === newMessage.sender || user._id === newMessage.receiver) {
            return { ...user, lastMessage: newMessage };
          }
          return user;
        });
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

  const renderUser = ({ item }) => {
    const isOnline = onlineUsers.has(item._id);
    const nameToDisplay = item.displayName || item.username;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.navigate('Chat', { 
            userId: item._id, 
            username: nameToDisplay,
            avatarUrl: item.avatarUrl // Pass the avatar URL
        })}
      >
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar} />
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userInfoTop}>
            <Text style={styles.username}>{nameToDisplay}</Text>
            {item.lastMessage && (
                <Text style={styles.timestamp}>
                    {formatTimestamp(item.lastMessage.createdAt)}
                </Text>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage ? item.lastMessage.content : 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No other users found.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // --- FIX: Add padding for Android status bar ---
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#e0e0e0',
  },
  onlineDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  lastMessage: {
    fontSize: 15,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  }
});

export default HomeScreen;
