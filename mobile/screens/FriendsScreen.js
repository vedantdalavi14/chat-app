import React, { useEffect, useState, useCallback } from 'react';
import { Text, StyleSheet, View, FlatList, Image, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import socket from '../socket';

const API_URL = 'http://192.168.1.4:5000';

const FriendsScreen = ({ navigation }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/friends/list`, { headers: { authorization: `Bearer ${token}` } });
      setFriends(res.data);
    } catch (e) {
      console.error('Friends fetch error', e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  useEffect(() => {
    const handleAccepted = ({ userA, userB }) => {
      // After acceptance either side may need updated list; simply refetch
      fetchFriends();
    };
    socket.on('friend:accepted', handleAccepted);
    return () => socket.off('friend:accepted', handleAccepted);
  }, [fetchFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  }, [fetchFriends]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => navigation.navigate('Chat', { userId: item._id, username: item.displayName || item.username })}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : <View style={[styles.avatar, styles.avatarPlaceholder]} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.displayName || item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No friends yet. Add some from the Find tab!</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
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
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  friendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', marginRight: 15 },
  avatarPlaceholder: { backgroundColor: '#e0e0e0' },
  name: { fontSize: 16, fontWeight: '500' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default FriendsScreen;
