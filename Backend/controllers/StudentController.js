const Student = require("../models/StudentModel");
const OTP = require("../models/OtpModel");
const jwt = require("jsonwebtoken");

exports.createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      instituteId,
      busId,
      pickupLocation,
      fcmToken,
      phoneNo,
      rollNo,
      standard,
      section,
      password,
      otp,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !instituteId ||
      !busId ||
      !pickupLocation ||
      !phoneNo ||
      !rollNo ||
      !standard ||
      !section ||
      !password ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields, including OTP and FCM Token, are required",
      });
    }

    // Check if Student is already registered
    const studentExist = await Student.findOne({ email });
    if (studentExist) {
      return res.status(409).json({
        success: false,
        message: "Student is already registered",
      });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email }).sort({ expiresAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Save Student (Mongoose hook pre-save handles password hashing)
    const newStudent = new Student({
      name,
      email,
      instituteId,
      busId,
      pickupLocation,
      fcmToken,
      phoneNo,
      rollNo,
      standard,
      section,
      password,
    });

    await newStudent.save();

    // Clean up OTP to prevent re-use
    await OTP.deleteMany({ email });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getStudentsByInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const students = await Student.find({
      instituteId: instituteId,
    }).select("-password");

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getStudentByStandard = async (req, res) => {
  try {
    const { standard } = req.params;
    const students = await Student.find({
      standard: standard,
    }).select("-password");

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });

  }
  catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

exports.updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const updatedInfo = req.body;

    const student = await Student.findByIdAndUpdate(
      studentId,
      updatedInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Info Updated!",
      student,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findByIdAndDelete(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.studentLogin = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await student.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (fcmToken) {
      student.fcmToken = fcmToken;
      await student.save();
    }

    const accessToken = jwt.sign(
      {
        id: student._id,
        role: "student",
        instituteId: student.instituteId,
        busId: student.busId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const studentResponse = student.toObject();
    delete studentResponse.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      student: studentResponse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.studentRefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const student = await Student.findById(decoded.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: student._id,
        role: "student",
        instituteId: student.instituteId,
        busId: student.busId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const newRefreshToken = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};