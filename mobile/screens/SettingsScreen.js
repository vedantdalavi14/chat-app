import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Image, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.8:5000';

const SettingsScreen = ({ authContext }) => {
  const [userData, setUserData] = useState(null);
  const [displayName, setDisplayName] = useState('');

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
      quality: 1,
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
      Alert.alert('Error', 'Failed to upload image.');
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

  return (
    <View style={styles.container}>
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
        <Button title="Logout" onPress={() => authContext.signOut()} color="#FF3B30" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    backgroundColor: '#fff',
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
  }
});

export default SettingsScreen;
