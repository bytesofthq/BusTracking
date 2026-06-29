const admin = require("../config/firebase");

const sendNotification = async (token, title, body) => {
  try {
    await admin.messaging().send({
      notification: {
        title,
        body,
      },
      token,
    });

    console.log("Notification sent");
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendNotification;