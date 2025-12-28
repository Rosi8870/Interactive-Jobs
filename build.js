const fs = require('fs');
const config = {
  apiKey: "AIzaSyAepkNSEviF1IjSRnyGfEoFKtY99hd-DPs",
  authDomain: "storagede.firebaseapp.com",
  projectId: "storagede",
  storageBucket: "storagede.firebasestorage.app",
  messagingSenderId: "67412993932",
  appId: "1:67412993932:web:963501ab50bc9074b158a9",
};
fs.writeFileSync('./firebase-config.js', `window.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};`);
console.log('Firebase config generated successfully.');