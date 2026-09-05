// ✅ Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
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
const auth = getAuth();
const db = getFirestore();

// ✅ Register User Function
window.registerUser = async function () {
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    // Check all fields
    if (!fullname || !email || !password || !role) {
        alert('Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        alert('Password should be at least 6 characters.');
        return;
    }

    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save extra info (fullname & role) in Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullname: fullname,
            email: email,
            role: role,
            password: password
        });

        alert('Registration successful! You can now login.');
        window.location.href = 'login.html';

    } catch (error) {
        alert(error.message);
    }
}