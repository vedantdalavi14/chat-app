import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import colors from '../theme/colors';

const API_URL = 'http://192.168.1.4:5000'; // Align with other screens

export default function FriendRequestsScreen({ onProcessed }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({}); // map of requestId -> boolean
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/friends/requests`, { headers: { authorization: `Bearer ${token}` } });
      setRequests(res.data);
    } catch (e) {
      console.error('Requests fetch error', e.response?.data || e.message);
      Alert.alert('Error', 'Could not load friend requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  const actOnRequest = async (requestId, action) => {
    if (processing[requestId]) return;
    try {
      setProcessing(prev => ({ ...prev, [requestId]: true }));
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/friends/${action}/${requestId}`, {}, { headers: { authorization: `Bearer ${token}` } });
      setRequests(prev => prev.filter(r => r._id !== requestId));
      if (action === 'accept') {
        Alert.alert('Friend Added', 'You are now friends!');
      }
      if (onProcessed) onProcessed(action);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || `Failed to ${action} request`);
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const renderItem = ({ item }) => {
    const sender = item.sender || {};
    return (
      <View style={styles.requestItem}>
        {sender.avatarUrl ? (
          <Image source={{ uri: sender.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{sender.displayName || sender.username}</Text>
          <Text style={styles.subText}>sent you a friend request</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            disabled={processing[item._id]}
            onPress={() => actOnRequest(item._id, 'accept')}
          >
            {processing[item._id] ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionText}>Accept</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={processing[item._id]}
            onPress={() => actOnRequest(item._id, 'reject')}
          >
            {processing[item._id] ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionText}>Reject</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchRequests}>
          <Text style={styles.refreshText}>Reload</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}> <ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={requests}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>No pending requests.</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: 6 },
  refreshText: { color: '#fff', fontWeight: '600' },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', marginRight: 15 },
  avatarPlaceholder: { backgroundColor: '#e0e0e0' },
  username: { fontSize: 16, fontWeight: '600' },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', marginLeft: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginLeft: 6 },
  acceptBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: '#888' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
