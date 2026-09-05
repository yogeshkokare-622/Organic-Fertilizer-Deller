import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCF5UAd7gRtnVr9AcQLGFDcYicopiLs5Fg",
  authDomain: "organic-fertilizer-deller.firebaseapp.com",
  projectId: "organic-fertilizer-deller",
  storageBucket: "organic-fertilizer-deller.firebasestorage.app",
  messagingSenderId: "238320479281",
  appId: "1:238320479281:web:17d5a09ed2bdd86e873910",
  measurementId: "G-BDK5S74XTR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();

window.loginUser = async function () {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            sessionStorage.setItem('loggedInUser', JSON.stringify(userData));

            alert(`Welcome, ${userData.fullname}!`);

            if (userData.role === 'seller') window.location.href = 'seller.html';
            else if (userData.role === 'shopowner') window.location.href = 'shopowner.html';
            else if (userData.role === 'admin') window.location.href = 'admin.html';
            else if (userData.role === 'buyer') window.location.href = 'buyer.html';
            else alert('User role not found. Please contact support.');
        } else {
            alert('User data not found in Firestore.');
        }
    } catch (error) {
        alert(error.message);
    }
};

window.forgotPassword = function () {
    alert('Please contact support to reset your password.');
};
