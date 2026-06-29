const express = require("express");
const router = express.Router();
const sendNotification = require("../utils/sendNotifications");
const Student = require("../models/StudentModel");
const Parent = require("../models/ParentModel");

// 1. Direct Token (Test Endpoint)
router.post("/send", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "Token, title, and body are required fields.",
      });
    }

    await sendNotification(token, title, body);

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while sending notification.",
    });
  }
});

// 2. Send to Specific Student by ID
router.post("/student", async (req, res) => {
  try {
    const { studentId, title, body } = req.body;

    if (!studentId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "studentId, title, and body are required fields.",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (!student.fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Student does not have an FCM registration token.",
      });
    }

    await sendNotification(student.fcmToken, title, body);

    return res.status(200).json({
      success: true,
      message: `Notification sent to student ${student.name}.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred.",
    });
  }
});

// 3. Send to Specific Parent by ID
router.post("/parent", async (req, res) => {
  try {
    const { parentId, title, body } = req.body;

    if (!parentId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "parentId, title, and body are required fields.",
      });
    }

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    if (!parent.fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Parent does not have an FCM registration token.",
      });
    }

    await sendNotification(parent.fcmToken, title, body);

    return res.status(200).json({
      success: true,
      message: `Notification sent to parent ${parent.parentName}.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred.",
    });
  }
});

// 4. Send to all Students & Parents of a Specific Bus Route
router.post("/bus", async (req, res) => {
  try {
    const { busId, title, body } = req.body;

    if (!busId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "busId, title, and body are required fields.",
      });
    }

    // Fetch tokens
    const students = await Student.find({ busId }).select("fcmToken name");
    const parents = await Parent.find({ busId }).select("fcmToken parentName");

    const tokens = [];
    students.forEach((s) => {
      if (s.fcmToken) tokens.push(s.fcmToken);
    });
    parents.forEach((p) => {
      if (p.fcmToken) tokens.push(p.fcmToken);
    });

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No registered FCM tokens found for this bus route.",
      });
    }

    // Send notifications in parallel
    const sendPromises = tokens.map((token) => sendNotification(token, title, body));
    await Promise.all(sendPromises);

    return res.status(200).json({
      success: true,
      message: `Notification broadcast sent to ${tokens.length} devices on bus route ${busId}.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred.",
    });
  }
});

// 5. Send to all Students & Parents of a Specific Institute
router.post("/institute", async (req, res) => {
  try {
    const { instituteId, title, body } = req.body;

    if (!instituteId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "instituteId, title, and body are required fields.",
      });
    }

    const students = await Student.find({ instituteId }).select("fcmToken");
    const parents = await Parent.find({ instituteId }).select("fcmToken");

    const tokens = [];
    students.forEach((s) => {
      if (s.fcmToken) tokens.push(s.fcmToken);
    });
    parents.forEach((p) => {
      if (p.fcmToken) tokens.push(p.fcmToken);
    });

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No registered FCM tokens found for this institute.",
      });
    }

    const sendPromises = tokens.map((token) => sendNotification(token, title, body));
    await Promise.all(sendPromises);

    return res.status(200).json({
      success: true,
      message: `Notification broadcast sent to ${tokens.length} devices in institute ${instituteId}.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred.",
    });
  }
});

module.exports = router;
