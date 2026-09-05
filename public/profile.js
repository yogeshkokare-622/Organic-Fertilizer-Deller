// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    updateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBTQBU-36fOozy0_4CTcxxcDo59TdC2Vg8",
    authDomain: "organic-fertilizer-165d0.firebaseapp.com",
    projectId: "organic-fertilizer-165d0",
    storageBucket: "organic-fertilizer-165d0.appspot.com",
    messagingSenderId: "552974558403",
    appId: "1:552974558403:web:137805685fa9afe1346e76",
    measurementId: "G-DXKGLVS7MW"
};


// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const profileForm = document.querySelector("form");
const fullNameInput = profileForm.querySelector("input[placeholder='Full Name']");
const dobInput = profileForm.querySelector("input[placeholder='Date Of Birth']");
const emailInput = profileForm.querySelector("input[placeholder='Email Id']");
const passwordInput = profileForm.querySelector("input[placeholder='Password']");
const phoneInput = profileForm.querySelector("input[placeholder='Phone']");
const addressInput = profileForm.querySelector("input[placeholder='Address']");
const profileImg = document.querySelector(".profile-image img");

// 🔹 Load user profile
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            fullNameInput.value = data.fullname || "";
            dobInput.value = data.dateOfBirth || "";
            emailInput.value = user.email;
            passwordInput.value = user.password;
            phoneInput.value = data.phone || "";
            addressInput.value = data.address || "";
            profileImg.src = user.photoURL || "https://via.placeholder.com/120";
        }
    }
});

// 🔹 Save profile
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("No user logged in");

    try {
        // Update Firebase Auth profile
        await updateProfile(user, {
            displayName: fullNameInput.value,
        });
        if (emailInput.value !== user.email) {
            await updateEmail(user, emailInput.value);
        }

        // Update Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            fullName: fullNameInput.value,
            dateOfBirth: dobInput.value,
            phone: phoneInput.value,
            password: passwordInput.value,
            address: addressInput.value,
            email: emailInput.value
        }, { merge: true });

        alert("Profile updated successfully ✅");
    } catch (err) {
        console.error("Update error:", err);
        alert("Error updating profile: " + err.message);
    }
})


document.addEventListener("DOMContentLoaded", function () {
    const togglePassword = document.getElementById("togglePassword");
    const passwordField = document.getElementById("passwordField");

    togglePassword.addEventListener("click", function () {
        const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
        passwordField.setAttribute("type", type);
        togglePassword.textContent = type === "password" ? "👁️" : "🙈";
    });

    const form = document.querySelector("form");
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const passwordValue = passwordInput.value;
        console.log("Password:", passwordValue); // This should now work
    });
});
