import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, // or your VAPID key
    });

    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error(err);
    return null;
  }
};