// Import Firebase SDKs from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCF5UAd7gRtnVr9AcQLGFDcYicopiLs5Fg",
  authDomain: "organic-fertilizer-deller.firebaseapp.com",
  projectId: "organic-fertilizer-deller",
  storageBucket: "organic-fertilizer-deller.firebasestorage.app",
  messagingSenderId: "238320479281",
  appId: "1:238320479281:web:17d5a09ed2bdd86e873910",
  measurementId: "G-BDK5S74XTR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Redirect function
window.redirectTo = function (page) {
    window.location.href = page;
};

console.log('Organic Fertilizer Page Loaded Successfully!');
