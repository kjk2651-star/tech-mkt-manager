import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCn3H2xz09bbkm4HpB2-JADWGqnCS1IGGE",
    authDomain: "intechmkt-a25af.firebaseapp.com",
    projectId: "intechmkt-a25af",
    storageBucket: "intechmkt-a25af.firebasestorage.app",
    messagingSenderId: "612205376110",
    appId: "1:612205376110:web:dca74d121844642e3bec7f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
