// Firebase Service Worker per le notifiche
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxvwdmENvt6KZj-Jnlv7FtA9EZd_P-AC0",
  authDomain: "todo-webapp-e0ac5.firebaseapp.com",
  projectId: "todo-webapp-e0ac5",
  storageBucket: "todo-webapp-e0ac5.firebasestorage.app",
  messagingSenderId: "543071263999",
  appId: "1:543071263999:web:e798d5ff32778b055400ca"
});

const messaging = firebase.messaging();

// Gestisci notifiche in background
messaging.onBackgroundMessage((payload) => {
  console.log('Notifica ricevuta in background:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Assicurati di avere questo file
    badge: '/logo192.png',
    tag: 'todo-notification',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});