import React, { useState, useEffect, useRef } from 'react';
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
  Image, // Import Image
} from 'react-native';
import socket from '../socket';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.8:5000';

// --- NEW: Custom Header Component ---
const ChatHeader = ({ username, avatarUrl }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 35, height: 35, borderRadius: 17.5, marginRight: 10 }} />
      ) : (
        // Fallback placeholder if no avatar
        <View style={{ width: 35, height: 35, borderRadius: 17.5, marginRight: 10, backgroundColor: '#e0e0e0' }} />
      )}
      <Text style={{ fontSize: 17, fontWeight: '600' }}>{username}</Text>
    </View>
  );
};

const ChatScreen = ({ route, navigation, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Get avatarUrl from the route params passed by HomeScreen
  const { userId: recipientId, username, avatarUrl } = route.params;

  const typingTimeout = useRef(null);

  useEffect(() => {
    // --- CHANGE: Use the custom header component ---
    navigation.setOptions({
      headerTitle: () => <ChatHeader username={username} avatarUrl={avatarUrl} />,
    });
  }, [username, avatarUrl, navigation]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(`${API_URL}/conversations/${recipientId}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        
        const formattedMessages = response.data.map(msg => ({
          _id: msg._id,
          text: msg.content,
          createdAt: new Date(msg.createdAt),
          user: { _id: msg.sender },
        }));

        setMessages(formattedMessages.reverse());
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        Alert.alert('Error', 'Could not load chat history.');
      }
    };

    fetchMessages();
  }, [recipientId]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      const newMessage = {
        _id: message._id || Math.random().toString(),
        text: message.content,
        createdAt: new Date(message.createdAt),
        user: { _id: message.sender },
      };
      setMessages(previousMessages => [newMessage, ...previousMessages]);
    };

    const handleTypingStarted = () => setIsTyping(true);
    const handleTypingStopped = () => setIsTyping(false);

    socket.on('message:new', handleNewMessage);
    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
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

  const handleInputChange = (text) => {
    setCurrentMessage(text);
    if (typingTimeout.current === null) {
      socket.emit('typing:start', { recipientId });
    } else {
      clearTimeout(typingTimeout.current);
    }
    
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { recipientId });
      typingTimeout.current = null;
    }, 1000);
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
      {isTyping && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingIndicatorText}>{username} is typing...</Text>
        </View>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={currentMessage}
          onChangeText={handleInputChange}
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
      typingIndicatorContainer: {
        paddingHorizontal: 15,
        paddingBottom: 5,
      },
      typingIndicatorText: {
        color: '#888',
        fontStyle: 'italic',
      }
});

export default ChatScreen;
