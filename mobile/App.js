import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import your screen components
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.error('Failed to fetch the token from storage', e);
      }
      setIsLoading(false);
    };

    checkUserToken();
  }, []);

  // Create an object with auth functions that we can pass to screens
  const authContext = useMemo(
    () => ({
      signIn: async (token) => {
        await AsyncStorage.setItem('userToken', token);
        setUserToken(token);
      },
      signOut: async () => {
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
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
            <Stack.Screen name="Chat" component={ChatScreen} />
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
