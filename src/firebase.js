import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVD8XNUzp6ML_9dFgMZrDjtxaVQvv-B3A",
  authDomain: "combien-app.firebaseapp.com",
  projectId: "combien-app",
  storageBucket: "combien-app.firebasestorage.app",
  messagingSenderId: "141718875194",
  appId: "1:141718875194:web:ff86b968a9e839f9de9903"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
