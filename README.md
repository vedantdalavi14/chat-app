# Real-Time 1:1 Chat Application

## Project Overview

This is a full-stack, real-time 1:1 chat application built to replicate the core functionalities of modern messaging apps like WhatsApp. The frontend is built with React Native (Expo), and the backend is powered by Node.js, Express, and Socket.IO, with MongoDB for data persistence.

The application provides a complete user experience, from authentication and profile customization to live, persistent conversations with other users.

## Live Video Demo

[(https://youtu.be/LJjvXaUAH5U)]

## Technology Stack

**Frontend:**

*   React Native (Expo)
*   React Navigation
*   Socket.IO Client
*   Axios
*   Expo Image Picker

**Backend:**

*   Node.js
*   Express.js
*   Socket.IO
*   MongoDB (with Mongoose)
*   JSON Web Tokens (JWT) for authentication
*   Bcrypt.js for password hashing
*   Multer for image uploads

## Features

This project successfully implements all the Minimum Viable Product (MVP) requirements and includes several additional enhancements to improve the user experience.

### Core MVP Features

*   **JWT-Based Authentication:** Secure user registration and login functionality.
*   **User Discovery:** After logging in, users can see a list of all other registered users.
*   **Real-Time Chat:** 1:1 messaging is handled in real-time using WebSockets via Socket.IO.
*   **Message Persistence:** All chat messages are saved to the MongoDB database, so conversation history is preserved.
*   **Typing Indicator:** Users can see when their conversation partner is actively typing a message.
*   **Online/Offline Status:** The user list displays a green dot next to users who are currently online and connected to the server.

### Enhanced Features (Beyond MVP)

*   **User Avatars:** Users can upload a profile picture from their device's gallery, which is displayed across the app.
*   **Custom Display Names:** Users can set a public display name that is shown to others, which can be different from their private login username.
*   **Dynamic Home Screen:** The "Chats" list is more than just a user list. It functions like a modern messenger, showing the last message exchanged and a timestamp for each conversation.
*   **Sorted Conversations:** The chat list is automatically sorted to show the most recent conversations at the top.
*   **Real-Time Home Screen Updates:** The last message and timestamp on the home screen update in real-time as new messages are received, without needing a manual refresh.
*   **Pull-to-Refresh:** Users can manually refresh the chat list by swiping down.
*   **Modern Tab Navigation:** The app uses a clean, tab-based navigation for "Chats" and "Settings", providing an intuitive user experience.
*   **Custom Chat Header:** The chat screen header displays the recipient's avatar and name, creating a more polished look.
*   **Logout:** Users can securely log out from the settings screen.
*   **Delete Account:** Users can delete their account from the settings screen, which also removes all their data from the server.

## Setup and Installation

### Prerequisites

*   Node.js (v16 or later)
*   npm
*   MongoDB (A free MongoDB Atlas cluster is recommended)
*   Expo Go app on your iOS or Android device

### 1. Clone the Repository

```bash
git clone https://github.com/vedantdalavi14/chat-app
cd chat-app
```

### 2. Backend Setup (`/server`)

Navigate to the server directory:

```bash
cd server
```

Install all required npm packages:

```bash
npm install
```

Create a `.env` file in the `/server` directory. Copy the contents of `.env.example` (if provided) or create it from scratch with the following variables:

```
MONGO_URI="<your_mongodb_connection_string>"
JWT_SECRET="<your_own_long_and_random_secret_key>"
```

Create the folders for storing uploaded avatars:

```bash
mkdir -p public/uploads
```

Start the backend server:

```bash
node index.js
```

The server will be running on `http://localhost:5000`.

### 3. Frontend Setup (`/mobile`)

Navigate to the mobile app directory from the root folder:

```bash
cd mobile
```

Install all required npm packages:

```bash
npm install
```

**IMPORTANT: Configure Server IP Address**

Your mobile app needs to know your computer's local IP address to connect to the server. You must update the `API_URL` variable in the following files:

*   `socket.js`
*   `screens/LoginScreen.js`
*   `screens/RegisterScreen.js`
*   `screens/HomeScreen.js`
*   `screens/SettingsScreen.js`

To find your IP address (ensure your computer and phone are on the same Wi-Fi network):

*   **On Windows:** Open Command Prompt and run `ipconfig`. Find the "IPv4 Address".
*   **On Mac:** Open Terminal and run `ifconfig | grep "inet "`.

Update the variable in each file to look like this (with your IP): `const API_URL = 'http://192.168.1.8:5000';`

Start the Metro development server:

```bash
npm start
```

Scan the QR code shown in the terminal using the Expo Go app on your phone.

## Sample Users

To test the application, you can register two or more users through the app's sign-up screen. For example:

**User 1:**

*   **Username:** `testuser1`
*   **Password:** `password123`

**User 2:**

*   **Username:** `testuser2`
*   **Password:** `password123`
