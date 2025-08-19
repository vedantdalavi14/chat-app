import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { jwtDecode } from 'jwt-decode';

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
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This listener will fire every time the socket successfully connects
    const onConnect = () => {
      console.log('Socket connected! Announcing user is online...');
      // To ensure we have the correct user ID, we read it from storage again
      AsyncStorage.getItem('userToken').then(token => {
        if (token) {
          const decoded = jwtDecode(token);
          socket.emit('user:online', decoded.user.id);
        }
      });
    };

    // We listen for the 'connect' event
    socket.on('connect', onConnect);

    // Initial check when the app loads
    const checkUserToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const decodedToken = jwtDecode(token);
          setUserId(decodedToken.user.id);
          setUserToken(token);
          // We just connect here. The 'onConnect' listener will handle the emit.
          socket.connect();
        }
      } catch (e) {
        console.error('Failed to process the token from storage', e);
      }
      setIsLoading(false);
    };

    checkUserToken();

    // Clean up the listener when the component unmounts
    return () => {
      socket.off('connect', onConnect);
    };
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (token) => {
        await AsyncStorage.setItem('userToken', token);
        const decodedToken = jwtDecode(token);
        setUserId(decodedToken.user.id);
        setUserToken(token);
        // We just connect here. The 'onConnect' listener will handle the emit.
        socket.connect();
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
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} authContext={authContext} />}
            </Stack.Screen>
            <Stack.Screen name="Chat">
              {(props) => <ChatScreen {...props} currentUserId={userId} />}
            </Stack.Screen>
          </>
        ) : (
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
