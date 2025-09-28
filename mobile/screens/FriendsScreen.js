import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';

const FriendsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Friend list / requests will appear here.</Text>
      </View>
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
  content: { paddingHorizontal: 16, paddingTop: 8 },
  subtitle: { fontSize: 16, color: '#666' }
});

export default FriendsScreen;
