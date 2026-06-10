const Student = require("../models/StudentModel");
const OTP = require("../models/OtpModel");

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
      !fcmToken ||
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

exports.getStudentByStandard= async(req,res)=>{
  try{
    const {standard} = req.params;
     const students = await Student.find({
      standard:standard,
    }).select("-password"); 

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });

  }
  catch(err){
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