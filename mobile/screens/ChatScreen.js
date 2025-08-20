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
  Image,
} from 'react-native';
import socket from '../socket';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = 'http://192.168.1.2:5000';

// Helper function to format the timestamp for messages
const formatMessageTimestamp = (date) => {
  if (!date) return '';
  const messageDate = new Date(date);
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageStatus = ({ status }) => {
  if (status === 'read') {
    return <Text style={styles.ticksRead}>✓✓</Text>;
  }
  if (status === 'delivered') {
    return <Text style={styles.ticks}>✓✓</Text>;
  }
  if (status === 'sent') {
    return <Text style={styles.ticks}>✓</Text>;
  }
  return null;
};

const ChatHeader = ({ username, avatarUrl }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 35, height: 35, borderRadius: 17.5, marginRight: 10 }} />
      ) : (
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
  const { userId: recipientId, username, avatarUrl } = route.params;

  const typingTimeout = useRef(null);

  useEffect(() => {
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
          status: msg.status,
        }));

        setMessages(formattedMessages.reverse());

        socket.emit('chat:read', { readerId: currentUserId, senderId: recipientId });

      } catch (error) {
        console.error('Failed to fetch messages:', error);
        Alert.alert('Error', 'Could not load chat history.');
      }
    };

    fetchMessages();
  }, [recipientId, currentUserId]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      const newMessage = {
        _id: message._id,
        text: message.content,
        createdAt: new Date(message.createdAt),
        user: { _id: message.sender },
        status: message.status,
      };
      setMessages(previousMessages => [newMessage, ...previousMessages]);
      socket.emit('chat:read', { readerId: currentUserId, senderId: message.sender });
    };

    const handleMessageSent = (sentMessage) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === sentMessage.tempId ? { ...msg, _id: sentMessage._id, status: sentMessage.status, createdAt: new Date(sentMessage.createdAt) } : msg
        )
      );
    };

    const handleMessagesRead = (data) => {
      if (data.conversationPartnerId === recipientId) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            (msg.user._id === currentUserId && msg.status !== 'read') ? { ...msg, status: 'read' } : msg
          )
        );
      }
    };

    const handleTypingStarted = () => setIsTyping(true);
    const handleTypingStopped = () => setIsTyping(false);

    socket.on('message:new', handleNewMessage);
    socket.on('message:sent', handleMessageSent);
    socket.on('messages:read', handleMessagesRead);
    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:sent', handleMessageSent);
      socket.off('messages:read', handleMessagesRead);
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
    };
  }, [currentUserId, recipientId]);

  const handleSend = () => {
    if (currentMessage.trim() === '') return;

    const tempId = Math.random().toString();
    const messageData = {
      senderId: currentUserId,
      recipientId: recipientId,
      text: currentMessage,
      tempId: tempId,
    };

    socket.emit('message:send', messageData);

    const newMessage = {
      _id: tempId,
      text: currentMessage,
      createdAt: new Date(),
      user: { _id: currentUserId },
      status: 'sent',
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
        <View style={styles.messageContent}>
          <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
            {item.text}
          </Text>
    
          {/* Time + (optional ticks) inside the bubble */}
          <View style={styles.statusContainer}>
            <Text style={styles.timestamp}>{formatMessageTimestamp(item.createdAt)}</Text>
            {isMyMessage && <MessageStatus status={item.status} />}
          </View>
        </View>
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
    backgroundColor: '#ECE5DD',
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
    backgroundColor: '#128C7E',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 15,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  messageContent: {
    marginBottom: 1,
  },
  myMessageText: {
    color: '#000',
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
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    color: 'grey',
    fontSize: 11,
    marginRight: 5,
  },
  ticks: {
    color: 'grey',
    fontSize: 12,
  },
  ticksRead: {
    color: '#34B7F1',
    fontSize: 12,
  }
});

export default ChatScreen;
