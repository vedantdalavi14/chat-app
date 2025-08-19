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
} from 'react-native';
import socket from '../socket'; // Import the socket instance

const ChatScreen = ({ route, navigation, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  // The recipient's ID and username are passed from the HomeScreen
  const { userId: recipientId, username } = route.params;

  // Set the header title to the username
  useEffect(() => {
    navigation.setOptions({ title: username });
  }, [username, navigation]);

  // Listen for incoming messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      // Create a message object that matches our state structure
      const newMessage = {
        _id: Math.random().toString(), // Use a random ID for the key
        text: message.text,
        createdAt: new Date(),
        user: { _id: message.senderId }, // The ID of the person who sent the message
      };
      setMessages(previousMessages => [newMessage, ...previousMessages]);
    };

    socket.on('message:new', handleNewMessage);

    // Clean up the listener when the component unmounts
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

    // Emit the message to the server
    socket.emit('message:send', messageData);

    // Add the message to our own screen immediately
    const newMessage = {
      _id: Math.random().toString(),
      text: currentMessage,
      createdAt: new Date(),
      user: { _id: currentUserId }, // This is our own message
    };
    setMessages(previousMessages => [newMessage, ...previousMessages]);
    setCurrentMessage('');
  };

  const renderItem = ({ item }) => {
    // Check if the message is from the current user
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
        inverted // This makes the chat start from the bottom
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
