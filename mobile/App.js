import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screen components
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

// This will be our main navigator
// For now, we will just show the login screen to start
export default function App() {
  // We will add logic here later to check if the user is logged in
  const userIsLoggedIn = false; 

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userIsLoggedIn ? (
          // Screens accessible after login
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          // Screens accessible before login
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }} // Hide the header for the login screen
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ title: 'Create Account' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
