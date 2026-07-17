// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// using your project's configuration details
firebase.initializeApp({
  apiKey: "AIzaSyAFS3bHx5SI42ykyhW-soPDLDgDGOlzhfw",
  authDomain: "bus-tracking-2af69.firebaseapp.com",
  projectId: "bus-tracking-2af69",
  storageBucket: "bus-tracking-2af69.firebasestorage.app",
  messagingSenderId: "361088469525",
  appId: "1:361088469525:web:b482f81eddef32df5c5c1c",
  measurementId: "G-MSXTMRP7JD"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'TrackMyBus Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message!',
    icon: '/favicon.svg', // Icon served from public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
