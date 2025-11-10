import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuP9yqILyneppmBiJLeJIfbkWGxENr_k8",
  authDomain: "kavisha-b2fde.firebaseapp.com",
  projectId: "kavisha-b2fde",
  storageBucket: "kavisha-b2fde.firebasestorage.app",
  messagingSenderId: "1063357017152",
  appId: "1:1063357017152:web:febd4485de245ab9b883a5",
  measurementId: "G-YG26QJKN58",
};

const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const firebaseAuth = getAuth(firebaseApp);

export { firebaseApp, firebaseAuth };
