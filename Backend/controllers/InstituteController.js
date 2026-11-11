const Institute = require("../models/InstituteModel");
const jwt = require("jsonwebtoken");

exports.createInstitute = async (req, res) => {
  try {
    const { name, totalBuses, totalVans, plan, address, password } = req.body;

    // Validate required fields
    if (
      !name ||
      totalBuses === undefined ||
      totalVans === undefined ||
      !plan ||
      !address ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if Institute name is already registered
    const instituteExist = await Institute.findOne({ name });
    if (instituteExist) {
      return res.status(409).json({
        success: false,
        message: "Institute is already registered with this name",
      });
    }

    // Save Institute (Mongoose pre-save hook handles hashing the password)
    const newInstitute = new Institute({
      name,
      totalBuses,
      totalVans,
      plan,
      address,
      password,
    });

    await newInstitute.save();

    return res.status(201).json({
      success: true,
      message: "Institute registered successfully",
      data: {
        id: newInstitute._id,
        name: newInstitute.name,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAllInstitutes = async (req, res) => {
  try {
    // Populate the plan model since the schema doesn't have an explicit ref
    const institutes = await Institute.find()
      .select("-password")
      .populate({ path: "plan", model: "Plan" });

    return res.status(200).json({
      success: true,
      count: institutes.length,
      institutes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getInstituteById = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const institute = await Institute.findById(instituteId)
      .select("-password")
      .populate({ path: "plan", model: "Plan" });

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    return res.status(200).json({
      success: true,
      institute,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;
    const updatedInfo = req.body;

    const institute = await Institute.findByIdAndUpdate(
      instituteId,
      updatedInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Institute updated successfully",
      institute,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const institute = await Institute.findByIdAndDelete(instituteId);

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Institute deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Public endpoint for registration dropdowns
exports.getPublicInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find()
      .select("_id name address totalBuses totalVans")
      .lean();

    return res.status(200).json({
      success: true,
      count: institutes.length,
      institutes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Institute Admin Login
exports.instituteLogin = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const institute = await Institute.findOne({ email: email.toLowerCase().trim() });
    if (!institute) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await institute.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (fcmToken) {
      institute.fcmToken = fcmToken;
      await institute.save();
    }

    const accessToken = jwt.sign(
      {
        id: institute._id,
        role: "admin",
        instituteId: institute._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      {
        id: institute._id,
        role: "admin",
        instituteId: institute._id.toString(),
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const instituteResponse = institute.toObject();
    delete instituteResponse.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      token: accessToken,
      institute: {
        ...instituteResponse,
        role: "admin"
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Refresh token for Institute Admin
exports.instituteRefreshToken = async (req, res) => {
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

    const institute = await Institute.findById(decoded.id);
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: institute._id,
        role: "admin",
        instituteId: institute._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const newRefreshToken = jwt.sign(
      {
        id: institute._id,
        role: "admin",
        instituteId: institute._id.toString(),
      },
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
