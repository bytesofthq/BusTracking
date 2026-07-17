const { getMessaging } = require("firebase-admin/messaging");
require("../config/firebase"); // Ensure Firebase app is initialized

const sendNotification = async (token, title, body) => {
  try {
    const response = await getMessaging().send({
      notification: {
        title,
        body,
      },
      token,
    });

    console.log("Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("FCM Send Error:", error);
    throw error;
  }
};

module.exports = sendNotification;