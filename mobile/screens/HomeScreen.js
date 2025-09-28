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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socket from '../socket';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.4:5000';

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
  const [sending, setSending] = useState({}); // track add friend actions
  const [accepting, setAccepting] = useState({}); // track accept actions
  const [showProspectsOnly, setShowProspectsOnly] = useState(false); // filter for non-friends
  const [search, setSearch] = useState('');
  const [incomingRequestsMap, setIncomingRequestsMap] = useState({}); // senderId -> requestId (incoming)
  const [outgoingRequestsMap, setOutgoingRequestsMap] = useState({}); // receiverId -> requestId (outgoing)

  const fetchUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await axios.get(`${API_URL}/users/all`, { headers: { authorization: `Bearer ${token}` } });
        // Sort: friends with recent chats first, then others
        const sorted = response.data.sort((a, b) => {
          const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        setUsers(sorted);
        // Build maps directly from decorated data (pendingIncomingRequestId / pendingOutgoingRequestId)
        const inMap = {};
        const outMap = {};
        sorted.forEach(u => {
          if (u.pendingIncoming && u.pendingIncomingRequestId) inMap[u._id] = u.pendingIncomingRequestId;
          if (u.pendingOutgoing && u.pendingOutgoingRequestId) outMap[u._id] = u.pendingOutgoingRequestId;
        });
        setIncomingRequestsMap(inMap);
        setOutgoingRequestsMap(outMap);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      Alert.alert('Error', 'Could not fetch users.');
    }
  }, []);

  const sendFriendRequest = async (userId) => {
    if (sending[userId]) return;
    try {
      setSending(p => ({ ...p, [userId]: true }));
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/friends/request/${userId}`, {}, { headers: { authorization: `Bearer ${token}` } });
      const fr = res.data;
      if (fr && fr._id) {
        setOutgoingRequestsMap(m => ({ ...m, [userId]: fr._id }));
      }
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, pendingOutgoing: true } : u));
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to send request');
    } finally {
      setSending(p => ({ ...p, [userId]: false }));
    }
  };

  const acceptFriendRequest = async (userId) => {
    // Need to find the friend request id: we only stored incoming flag
    if (accepting[userId]) return;
    try {
      setAccepting(p => ({ ...p, [userId]: true }));
      const token = await AsyncStorage.getItem('userToken');
      // Fetch pending requests to find matching sender id
      const reqRes = await axios.get(`${API_URL}/friends/requests`, { headers: { authorization: `Bearer ${token}` } });
      const match = reqRes.data.find(r => r.sender?._id === userId);
      if (!match) {
        Alert.alert('Not found', 'Pending request not located. Pull to refresh.');
      } else {
        await axios.post(`${API_URL}/friends/accept/${match._id}`, {}, { headers: { authorization: `Bearer ${token}` } });
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isFriend: true, pendingIncoming: false } : u));
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to accept request');
    } finally {
      setAccepting(p => ({ ...p, [userId]: false }));
    }
  };

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

    const handleFriendAccepted = ({ userA, userB }) => {
      setUsers(prev => prev.map(u => (u._id === userA || u._id === userB) ? { ...u, isFriend: true, pendingIncoming: false, pendingOutgoing: false } : u));
      // Clean any mapping (we don't know which side we are here but safe to delete both ids)
      setOutgoingRequestsMap(prev => {
        const copy = { ...prev };
        delete copy[userA];
        delete copy[userB];
        return copy;
      });
      setIncomingRequestsMap(prev => {
        const copy = { ...prev };
        delete copy[userA];
        delete copy[userB];
        return copy;
      });
    };
    const handleRequestCancel = ({ from }) => {
      setUsers(prev => prev.map(u => u._id === from ? { ...u, pendingIncoming: false } : u));
      setIncomingRequestsMap(prev => {
        const copy = { ...prev };
        delete copy[from];
        return copy;
      });
    };

    socket.on('users:online', handleUsersOnline);
    socket.on('user:connected', handleUserConnected);
    socket.on('user:disconnected', handleUserDisconnected);
    socket.on('message:new', handleNewMessage);
    socket.on('friend:accepted', handleFriendAccepted);
    socket.on('friend:request:cancel', handleRequestCancel);

    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:connected', handleUserConnected);
      socket.off('user:disconnected', handleUserDisconnected);
      socket.off('message:new', handleNewMessage);
      socket.off('friend:accepted', handleFriendAccepted);
      socket.off('friend:request:cancel', handleRequestCancel);
    };
  }, []);

  const cancelOutgoingRequest = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // find request where I am sender and receiver is userId -> need separate endpoint? we'll query both sides quickly
      const list = await axios.get(`${API_URL}/friends/requests`, { headers: { authorization: `Bearer ${token}` } });
      // requests endpoint returns only incoming for me; need outgoing query (not built) so implement workaround: create outgoing cancel route requires id, we can't get it from incoming. Simpler: add new endpoint? For now skip mapping and change backend? We'll add /friends/outgoing.
    } catch (e) {}
  };

  const cancelPending = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      let requestId = outgoingRequestsMap[userId];
      // Fallback still available if needed (network race) - only if no id known
      if (!requestId) {
        try {
          const res = await axios.get(`${API_URL}/friends/outgoing`, { headers: { authorization: `Bearer ${token}` } });
          const match = res.data.find(r => r.receiver === userId || r.receiver?._id === userId);
          if (match) {
            requestId = match._id;
            setOutgoingRequestsMap(m => ({ ...m, [userId]: requestId }));
          }
        } catch (e) {}
      }
      if (!requestId) { Alert.alert('Not found', 'Could not locate request id.'); return; }
      await axios.post(`${API_URL}/friends/cancel/${requestId}`, {}, { headers: { authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, pendingOutgoing: false } : u));
      setOutgoingRequestsMap(m => { const copy = { ...m }; delete copy[userId]; return copy; });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to cancel request');
    }
  };

  const renderUser = ({ item }) => {
    const isOnline = onlineUsers.has(item._id);
    const nameToDisplay = item.displayName || item.username;
    const showChat = item.isFriend; // currently restricts

    let actionButton = null;
    if (!item.isFriend) {
      if (item.pendingOutgoing) {
        actionButton = (
          <View style={styles.pendingRow}>
            <View style={[styles.badge, styles.pendingBadge]}><Text style={styles.badgeText}>Pending</Text></View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelPending(item._id)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );
      } else if (item.pendingIncoming) {
        actionButton = (
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} disabled={accepting[item._id]} onPress={() => acceptFriendRequest(item._id)}>
            <Text style={styles.actionText}>{accepting[item._id] ? '...' : 'Accept'}</Text>
          </TouchableOpacity>
        );
      } else {
        actionButton = (
          <TouchableOpacity style={styles.actionBtn} disabled={sending[item._id]} onPress={() => sendFriendRequest(item._id)}>
            <Text style={styles.actionText}>{sending[item._id] ? '...' : 'Add'}</Text>
          </TouchableOpacity>
        );
      }
    }

    return (
      <View style={styles.userItem}>
        <TouchableOpacity style={styles.userTap} onPress={() => navigation.navigate('Chat', { userId: item._id, username: nameToDisplay, avatarUrl: item.avatarUrl })}>
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            {isOnline && <View style={styles.onlineDot} />}
            {item.isFriend ? <View style={styles.friendStar} /> : null}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userInfoTop}>
              <Text style={styles.username}>{nameToDisplay}</Text>
              {item.lastMessage && (
                <Text style={styles.timestamp}>{formatTimestamp(item.lastMessage.createdAt)}</Text>
              )}
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.isFriend
                ? (item.lastMessage ? item.lastMessage.content : 'No messages yet')
                : item.pendingIncoming ? 'Wants to connect' : item.pendingOutgoing ? 'Request sent' : 'Not friends yet'}
            </Text>
          </View>
        </TouchableOpacity>
        {actionButton}
      </View>
    );
  };

  const filteredUsers = (showProspectsOnly ? users.filter(u => !u.isFriend) : users)
    .filter(u => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (u.username && u.username.toLowerCase().includes(term)) || (u.displayName && u.displayName.toLowerCase().includes(term));
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterToggle, showProspectsOnly && styles.filterToggleActive]}
            onPress={() => setShowProspectsOnly(v => !v)}
          >
            <Text style={styles.filterToggleText}>{showProspectsOnly ? 'Show All' : 'Only Not Friends'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchBarWrapper}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search users..."
          style={styles.searchInput}
          placeholderTextColor="#888"
        />
      </View>
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Small consistent top padding
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggle: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  friendStar: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    backgroundColor: '#FFD700',
    borderRadius: 7,
    borderWidth: 1,
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
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 10,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#999',
    marginLeft: 10,
  },
  pendingBadge: {
    backgroundColor: '#999',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#555',
  },
  cancelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  searchBarWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#111',
  },
});

export default HomeScreen;
