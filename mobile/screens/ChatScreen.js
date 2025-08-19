import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import socket from '../socket'; // Import the socket instance
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.8:5000';

const ChatScreen = ({ route, navigation, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const { userId: recipientId, username } = route.params;

  useEffect(() => {
    navigation.setOptions({ title: username });
  }, [username, navigation]);

  // --- NEW: Fetch message history when the component mounts ---
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(`${API_URL}/conversations/${recipientId}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        
        // Format the messages from the API to match the state structure
        const formattedMessages = response.data.map(msg => ({
          _id: msg._id,
          text: msg.content,
          createdAt: new Date(msg.createdAt),
          user: { _id: msg.sender },
        }));

        setMessages(formattedMessages.reverse()); // Reverse to show newest at the bottom
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        Alert.alert('Error', 'Could not load chat history.');
      }
    };

    fetchMessages();
  }, [recipientId]);
  // ---------------------------------------------------------

  useEffect(() => {
    const handleNewMessage = (message) => {
      const newMessage = {
        _id: Math.random().toString(),
        text: message.text,
        createdAt: new Date(),
        user: { _id: message.senderId },
      };
      setMessages(previousMessages => [newMessage, ...previousMessages]);
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, []);

  const handleSend = () => {
    if (currentMessage.trim() === '') return;

    const messageData = {
      senderId: currentUserId,
      recipientId: recipientId,
      text: currentMessage,
    };

    socket.emit('message:send', messageData);

    const newMessage = {
      _id: Math.random().toString(),
      text: currentMessage,
      createdAt: new Date(),
      user: { _id: currentUserId },
    };
    setMessages(previousMessages => [newMessage, ...previousMessages]);
    setCurrentMessage('');
  };

  const renderItem = ({ item }) => {
    const isMyMessage = item.user._id === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item._id.toString()}
        inverted
        contentContainerStyle={{ paddingVertical: 10 }}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={currentMessage}
          onChangeText={setCurrentMessage}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'blue',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageContainer: {
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 15,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
});

export default ChatScreen;
