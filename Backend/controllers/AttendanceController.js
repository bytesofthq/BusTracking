const mongoose = require("mongoose");
const Attendance = require("../models/AttendanceModel");
const Parent = require("../models/ParentModel");
const sendNotification = require("../utils/sendNotifications");

// Mark student attendance
exports.markAttendance = async (req, res) => {
  try {
    const {
      studentId,
      parentId,
      instituteId,
      busId,
      attendance,
      location,
      time,
    } = req.body;

    // Validate required fields
    if (!studentId || !parentId || !instituteId || !busId || !location) {
      return res.status(400).json({
        success: false,
        message: "studentId, parentId, instituteId, busId, and location are required",
      });
    }

    if (
      typeof location !== "object" ||
      location.lat === undefined ||
      location.lng === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "location must be an object with lat and lng",
      });
    }

    const newAttendance = new Attendance({
      studentId,
      parentId,
      instituteId,
      busId,
      attendance: attendance || "not-marked",
      location,
      time: time ? new Date(time) : new Date(),
    });

    await newAttendance.save();

    // Trigger asynchronous FCM notification to parent
    if (parentId) {
      Parent.findById(parentId)
        .then(async (parent) => {
          if (parent && parent.fcmToken) {
            const student = await mongoose.model("Student").findById(studentId);
            const studentName = student ? student.name : "Your child";
            const statusText = attendance === "present" ? "Present ✅" : "Absent ❌";
            
            await sendNotification(
              parent.fcmToken,
              "Attendance Status Update 🔔",
              `${studentName} was marked ${statusText} for the bus route.`
            );
          }
        })
        .catch((err) => console.error("Failed to send attendance FCM notification:", err));
    }

    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: newAttendance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get attendance with dynamic filters (covers all possible conditions for fetching)
exports.getAttendance = async (req, res) => {
  try {
    const {
      instituteId,
      busId,
      parentId,
      studentId,
      status,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (instituteId) filter.instituteId = instituteId;
    if (busId) filter.busId = busId;
    if (parentId) filter.parentId = parentId;
    if (studentId) filter.studentId = studentId;
    if (status) filter.attendance = status;

    if (startDate || endDate) {
      filter.time = {};
      if (startDate) {
        filter.time.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        filter.time.$lte = end;
      }
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate({ path: "studentId", select: "name email phoneNo rollNo standard section" })
      .populate({ path: "parentId", select: "parentName childsName phoneNo" })
      .populate({ path: "instituteId", select: "name address" })
      .populate({ path: "busId", select: "busNo busId capacity" })
      .sort({ time: -1 });

    return res.status(200).json({
      success: true,
      count: attendanceRecords.length,
      data: attendanceRecords,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get attendance statistics (e.g. for dashboard stats)
exports.getAttendanceStats = async (req, res) => {
  try {
    const { instituteId, busId, date } = req.query;

    const filter = {};
    if (instituteId) filter.instituteId = instituteId;
    if (busId) filter.busId = busId;

    // Default to today if no date specified
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    filter.time = {
      $gte: startOfDay,
      $lte: endOfDay,
    };

    const records = await Attendance.find(filter);

    const stats = {
      total: records.length,
      present: records.filter((r) => r.attendance === "present").length,
      absent: records.filter((r) => r.attendance === "absent").length,
      notMarked: records.filter((r) => r.attendance === "not-marked").length,
    };

    return res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      stats,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
