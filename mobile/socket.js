import { io } from 'socket.io-client';

const API_URL = 'http://192.168.1.3:5000';

// Initialize the socket connection
// The 'autoConnect: false' option prevents it from connecting automatically
const socket = io(API_URL, {
  autoConnect: false
});

export default socket;
