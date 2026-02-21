// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwJPPJxc0U7KlmyPb8xotwXr54iGZOP_c",
  authDomain: "test-38c17.firebaseapp.com",
  projectId: "test-38c17",
  storageBucket: "test-38c17.firebasestorage.app",
  messagingSenderId: "826457409949",
  appId: "1:826457409949:web:a49a288ef5a19cc57d8774",
  measurementId: "G-PN5NYKWDT6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);