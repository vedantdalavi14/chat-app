import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // Import tab navigator
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { jwtDecode } from 'jwt-decode';

import socket from './socket';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FriendsScreen from './screens/FriendsScreen';
import FindPeopleScreen from './screens/FindPeopleScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen'; // Import the new screen
import { Ionicons } from '@expo/vector-icons';
import colors from './theme/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator(); // Create a tab navigator instance

// This component will be the main UI after logging in, containing the tabs
function AppTabs({ authContext }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -2 },
          height: 60,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Global Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Find') {
            iconName = focused ? 'person-add' : 'person-add-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'mail-unread' : 'mail-unread-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Global Chat"
        children={(props) => <HomeScreen {...props} authContext={authContext} />}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
      />
      <Tab.Screen
        name="Find"
        component={FindPeopleScreen}
      />
      <Tab.Screen
        name="Requests"
        component={FriendRequestsScreen}
      />
      <Tab.Screen
        name="Settings"
        children={(props) => <SettingsScreen {...props} authContext={authContext} />}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onConnect = () => {
      console.log('Socket connected! Announcing user is online...');
      AsyncStorage.getItem('userToken').then(token => {
        if (token) {
          const decoded = jwtDecode(token);
          socket.emit('user:online', decoded.user.id);
        }
      });
    };

    socket.on('connect', onConnect);

    const checkUserToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const decodedToken = jwtDecode(token);
          setUserId(decodedToken.user.id);
          setUserToken(token);
          socket.connect();
        }
      } catch (e) {
        console.error('Failed to process the token from storage', e);
      }
      setIsLoading(false);
    };

    checkUserToken();

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
          // If logged in, show the AppTabs and the ChatScreen in a stack
          <>
            <Stack.Screen name="AppTabs" options={{ headerShown: false }}>
              {(props) => <AppTabs {...props} authContext={authContext} />}
            </Stack.Screen>
            <Stack.Screen name="Chat">
              {(props) => <ChatScreen {...props} currentUserId={userId} />}
            </Stack.Screen>
          </>
        ) : (
          // If not logged in, show the auth screens
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
