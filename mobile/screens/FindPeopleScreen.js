import React, { useEffect, useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import colors from '../theme/colors';

const API_URL = 'http://192.168.1.4:5000'; // reuse current server IP

export default function FindPeopleScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({}); // map of userId -> boolean
  const [refreshing, setRefreshing] = useState(false);

  const fetchDiscover = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/friends/discover`, { headers: { authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (e) {
      console.error('Discover fetch error', e.response?.data || e.message);
      Alert.alert('Error', 'Could not load users to discover');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscover();
  }, [fetchDiscover]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDiscover();
    setRefreshing(false);
  }, [fetchDiscover]);

  const sendRequest = async (userId) => {
    if (sending[userId]) return;
    try {
      setSending(prev => ({ ...prev, [userId]: true }));
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/friends/request/${userId}`, {}, { headers: { authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => u._id !== userId));
      Alert.alert('Request Sent', 'Friend request has been sent.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to send request');
    } finally {
      setSending(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.userItem}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />)
      }
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{item.displayName || item.username}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item._id)} disabled={sending[item._id]}>
        {sending[item._id] ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find People</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDiscover}>
          <Text style={styles.refreshText}>Reload</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No users to add right now.</Text>}
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
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', marginRight: 15 },
  avatarPlaceholder: { backgroundColor: '#e0e0e0' },
  username: { fontSize: 16, fontWeight: '500' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
