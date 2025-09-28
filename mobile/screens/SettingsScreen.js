import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Image, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.4:5000';

const SettingsScreen = ({ authContext }) => {
  const [userData, setUserData] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await axios.get(`${API_URL}/profile/me`, {
          headers: { authorization: `Bearer ${token}` },
        });
        setUserData(response.data);
        // Set the initial value for the input field
        setDisplayName(response.data.displayName || response.data.username);
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
      Alert.alert('Error', 'Could not load your profile data.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos to set your avatar.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const token = await AsyncStorage.getItem('userToken');
    const formData = new FormData();
    
    formData.append('avatar', {
      uri: uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });

    try {
      const response = await axios.put(`${API_URL}/profile/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          authorization: `Bearer ${token}`,
        },
      });
      
      setUserData(response.data);
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      console.error('Image upload error:', error.response?.data || error.message);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        Alert.alert('Network Error', 'Please check your internet connection and make sure the server is running.');
      } else {
        Alert.alert('Error', `Failed to upload image: ${error.response?.data?.msg || error.message}`);
      }
    }
  };

  // --- NEW: Function to handle saving the display name ---
  const handleSaveName = async () => {
    if (displayName.trim() === '') {
        Alert.alert('Error', 'Display name cannot be empty.');
        return;
    }
    try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.put(`${API_URL}/profile/name`, 
            { displayName },
            {
                headers: { authorization: `Bearer ${token}` },
            }
        );
        setUserData(response.data);
        Alert.alert('Success', 'Display name updated!');
    } catch (error) {
        console.error('Name update error:', error.response?.data || error.message);
        Alert.alert('Error', 'Failed to update display name.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => authContext.signOut(),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. Are you sure you want to permanently delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setDeleteModalVisible(true), // Open the custom modal
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!password) {
      Alert.alert('Error', 'Password is required.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/profile`,
        {
          headers: { authorization: `Bearer ${token}` },
          data: { password } 
        }
      );

      setDeleteModalVisible(false);
      setPassword('');
      Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
      authContext.signOut();

    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'An error occurred.';
      Alert.alert('Deletion Failed', errorMsg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      {/* --- Password Confirmation Modal --- */}
      <Modal
        transparent={true}
        visible={isDeleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalText}>Please enter your password to permanently delete your account.</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInputField}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => { setDeleteModalVisible(false); setPassword(''); }} />
              <Button title="Confirm" color="#FF3B30" onPress={confirmDeleteAccount} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.content}>
        <TouchableOpacity onPress={handleChoosePhoto}>
        {userData?.avatarUrl ? (
          <Image source={{ uri: userData.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
          </View>
        )}
        </TouchableOpacity>
      
      {/* --- NEW: Display Name Input --- */}
      <View style={styles.nameContainer}>
        <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
        />
        <Button title="Save" onPress={handleSaveName} />
      </View>
      <Text style={styles.usernameLabel}>@{userData?.username}</Text>
      
      <View style={styles.logoutButton}>
        <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    backgroundColor: '#fff',
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
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholderText: {
    color: '#888',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  nameInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    marginRight: 10,
  },
  usernameLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 100, 
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  // --- Styles for Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  passwordInput: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  passwordContainer: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  passwordInputField: {
    flex: 1,
    height: '100%',
  },
  eyeButton: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 20,
  }
});

export default SettingsScreen;
