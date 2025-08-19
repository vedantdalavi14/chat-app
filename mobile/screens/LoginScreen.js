import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Alert, // Import Alert for showing messages
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Replace this with your computer's local IP address
// You cannot use 'localhost' from your mobile device
const API_URL = 'http://192.168.1.8:5000'; // This has been updated to your IP address

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      const { token } = response.data;

      // Store the token securely
      await AsyncStorage.setItem('userToken', token);

      Alert.alert('Success', 'Logged in successfully!');

      // We will add navigation to the Home screen later
      // For now, a success message is enough to confirm it works.

    } catch (error) {
      console.error('Login Error:', error.response?.data || error.message);
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back!</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry // Hides the password
      />

      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerButtonText}>
          Don't have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  registerButton: {
    marginTop: 20,
  },
  registerButtonText: {
    color: 'blue',
    fontSize: 16,
  },
});

export default LoginScreen;
