import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFS3bHx5SI42ykyhW-soPDLDgDGOlzhfw",
  authDomain: "bus-tracking-2af69.firebaseapp.com",
  projectId: "bus-tracking-2af69",
  storageBucket: "bus-tracking-2af69.firebasestorage.app",
  messagingSenderId: "361088469525",
  appId: "1:361088469525:web:b482f81eddef32df5c5c1c",
  measurementId: "G-MSXTMRP7JD"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const messaging = getMessaging(app);