const OTP = require("../models/OtpModel");
const Student = require("../models/StudentModel");
const otpGenerator = require("otp-generator");
const sendMail = require("../utils/sendMail");

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
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

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    await OTP.deleteMany({ email });

    await OTP.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendMail(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP Sent Successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};