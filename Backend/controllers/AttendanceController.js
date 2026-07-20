const mongoose = require("mongoose");
const Attendance = require("../models/AttendanceModel");
const Parent = require("../models/ParentModel");
const Student = require("../models/StudentModel");
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

// Helper to get calendar days for a given year and month (1-indexed month, e.g., 7 = July)
function getCalendarWeeksForMonth(year, month, leaveRecordsMap) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  
  const weeks = [];
  let currentWeek = { weekIndex: 1, days: [] };
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  for (let day = 1; day <= endDate.getUTCDate(); day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dbRecord = leaveRecordsMap[dateStr];
    const status = dbRecord ? dbRecord.attendance : "present";
    const reason = dbRecord ? dbRecord.reason : "";
    
    const dayObj = {
      date: dateStr,
      dayName: dayNames[dayOfWeek],
      dayOfMonth: day,
      isSchoolDay: dayOfWeek !== 0,
      status: status,
      reason: reason
    };
    
    currentWeek.days.push(dayObj);
    
    // If Sunday or last day of the month, close the current week
    if (dayOfWeek === 0 || day === endDate.getUTCDate()) {
      weeks.push(currentWeek);
      if (day < endDate.getUTCDate()) {
        currentWeek = { weekIndex: weeks.length + 1, days: [] };
      }
    }
  }
  
  return weeks;
}

// Get parent leave planner for a month
exports.getPlannerMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    let { studentId } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "year and month are required",
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid year or month value",
      });
    }

    if (!studentId) {
      if (req.user && req.user.role === "parent") {
        const student = await Student.findOne({
          rollNo: req.user.ChildsRollNo,
          standard: req.user.ChildsClass,
          section: req.user.ChildsSection,
          instituteId: req.user.instituteId
        });
        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student linked to parent not found",
          });
        }
        studentId = student._id;
      } else if (req.user && req.user.role === "student") {
        studentId = req.user.id;
      } else {
        return res.status(400).json({
          success: false,
          message: "studentId is required for this role",
        });
      }
    }

    const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

    const records = await Attendance.find({
      studentId,
      isPreMarked: true,
      time: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const leaveRecordsMap = {};
    records.forEach(r => {
      const dateStr = r.time.toISOString().split("T")[0];
      leaveRecordsMap[dateStr] = r;
    });

    const weeks = getCalendarWeeksForMonth(yearNum, monthNum, leaveRecordsMap);

    return res.status(200).json({
      success: true,
      studentId,
      year: yearNum,
      month: monthNum,
      weeks
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Update/Mark status for a specific date in leave planner
exports.updatePlannerAttendance = async (req, res) => {
  try {
    const { date, status, reason } = req.body;
    let { studentId } = req.body;

    if (!date || !status) {
      return res.status(400).json({
        success: false,
        message: "date (YYYY-MM-DD) and status ('present' or 'absent') are required",
      });
    }

    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be either 'present' or 'absent'",
      });
    }

    let student;
    if (!studentId) {
      if (req.user && req.user.role === "parent") {
        student = await Student.findOne({
          rollNo: req.user.ChildsRollNo,
          standard: req.user.ChildsClass,
          section: req.user.ChildsSection,
          instituteId: req.user.instituteId
        });
        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student linked to parent not found",
          });
        }
        studentId = student._id;
      } else if (req.user && req.user.role === "student") {
        studentId = req.user.id;
        student = await Student.findById(studentId);
      } else {
        return res.status(400).json({
          success: false,
          message: "studentId is required for this role",
        });
      }
    } else {
      student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }
    }

    const parts = date.split("-");
    if (parts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "date must be in YYYY-MM-DD format",
      });
    }
    const utcDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));

    const parent = await Parent.findOne({
      ChildsRollNo: student.rollNo,
      ChildsClass: student.standard,
      ChildsSection: student.section,
      instituteId: student.instituteId
    });
    const parentId = parent ? parent._id : (req.user ? req.user.id : null);

    if (status === "present") {
      await Attendance.findOneAndDelete({
        studentId,
        time: utcDate,
        isPreMarked: true
      });

      return res.status(200).json({
        success: true,
        message: "Attendance set to present (default state restored)",
        data: { studentId, date, status: "present" }
      });
    } else {
      const updatedRecord = await Attendance.findOneAndUpdate(
        { studentId, time: utcDate, isPreMarked: true },
        {
          studentId,
          parentId,
          instituteId: student.instituteId,
          busId: student.busId,
          time: utcDate,
          attendance: "absent",
          isPreMarked: true,
          reason: reason || ""
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Attendance marked as absent successfully",
        data: updatedRecord
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get absent students for a specific bus (driver view)
exports.getAbsentStudentsForBus = async (req, res) => {
  try {
    const { date } = req.query;
    let { busId } = req.query;

    if (!busId) {
      if (req.user && (req.user.role === "driver" || req.user.role === "parent")) {
        busId = req.user.busId;
      } else {
        return res.status(400).json({
          success: false,
          message: "busId is required for this role",
        });
      }
    }

    if (!busId) {
      return res.status(400).json({
        success: false,
        message: "Bus ID not found or not assigned",
      });
    }

    let utcDate;
    if (date) {
      const parts = date.split("-");
      utcDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
      const today = new Date();
      utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    const records = await Attendance.find({
      busId,
      time: utcDate,
      isPreMarked: true,
      attendance: "absent"
    }).populate({
      path: "studentId",
      select: "name email phoneNo rollNo standard section pickupLocation"
    });

    return res.status(200).json({
      success: true,
      date: utcDate.toISOString().split("T")[0],
      busId,
      count: records.length,
      absentStudents: records.map(r => r.studentId).filter(s => s !== null)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get absent students for a specific institute (institute view)
exports.getAbsentStudentsForInstitute = async (req, res) => {
  try {
    const { date } = req.query;
    let { instituteId } = req.query;

    if (!instituteId) {
      if (req.user) {
        instituteId = req.user.instituteId;
      } else {
        return res.status(400).json({
          success: false,
          message: "instituteId is required",
        });
      }
    }

    let utcDate;
    if (date) {
      const parts = date.split("-");
      utcDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    } else {
      const today = new Date();
      utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    const records = await Attendance.find({
      instituteId,
      time: utcDate,
      isPreMarked: true,
      attendance: "absent"
    })
    .populate({
      path: "studentId",
      select: "name email phoneNo rollNo standard section pickupLocation"
    })
    .populate({
      path: "busId",
      select: "busNo busId capacity"
    });

    return res.status(200).json({
      success: true,
      date: utcDate.toISOString().split("T")[0],
      instituteId,
      count: records.length,
      absentRecords: records.map(r => ({
        student: r.studentId,
        bus: r.busId,
        reason: r.reason
      })).filter(r => r.student !== null)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


