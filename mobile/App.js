import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode

// Import the socket instance
import socket from './socket';

// Import your screen components
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null); // State to hold the user's ID
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const decodedToken = jwtDecode(token);
          setUserId(decodedToken.user.id); // Set the user ID from the token
          setUserToken(token);
          socket.connect();
          socket.emit('user:online', decodedToken.user.id); // Announce that this user is online
        }
      } catch (e) {
        console.error('Failed to process the token from storage', e);
      }
      setIsLoading(false);
    };

    checkUserToken();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (token) => {
        await AsyncStorage.setItem('userToken', token);
        const decodedToken = jwtDecode(token);
        setUserId(decodedToken.user.id);
        setUserToken(token);
        socket.connect();
        socket.emit('user:online', decodedToken.user.id);
      },
      signOut: async () => {
        await AsyncStorage.removeItem('userToken');
        socket.disconnect();
        setUserToken(null);
        setUserId(null);
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userToken ? (
          // Screens accessible after login
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} authContext={authContext} />}
            </Stack.Screen>
            {/* Pass the userId to the ChatScreen */}
            <Stack.Screen name="Chat">
              {(props) => <ChatScreen {...props} currentUserId={userId} />}
            </Stack.Screen>
          </>
        ) : (
          // Screens accessible before login
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} authContext={authContext} />}
            </Stack.Screen>
            <Stack.Screen name="Register" options={{ title: 'Create Account' }}>
              {(props) => <RegisterScreen {...props} authContext={authContext} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
