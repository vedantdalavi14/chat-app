import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// We can reuse the same API_URL from the Login screen
const API_URL = 'http://192.168.1.8:5000'; 

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        password,
      });

      const { token } = response.data;

      // Store the token so the user is logged in immediately
      await AsyncStorage.setItem('userToken', token);

      Alert.alert('Success', 'Account created successfully!');
      
      // We will add navigation to the Home screen later

    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMsg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>

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
        secureTextEntry
      />

      <Button title="Sign Up" onPress={handleRegister} />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginButtonText}>
          Already have an account? Login
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
  loginButton: {
    marginTop: 20,
  },
  loginButtonText: {
    color: 'blue',
    fontSize: 16,
  },
});

export default RegisterScreen;
