import { getToken, onMessage } from "firebase/messaging";
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

// Listen for messages while the app is in the foreground
if (typeof window !== "undefined") {
  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    if (Notification.permission === "granted") {
      new Notification(payload.notification?.title || "TrackMyBus Notification", {
        body: payload.notification?.body || "You have a new update!",
        icon: "/favicon.svg",
      });
    }
  });
}