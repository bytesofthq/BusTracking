const Parent = require("../models/ParentModel");
const jwt = require("jsonwebtoken");

exports.createParent = async (req, res) => {
  try {
    const {
      parentName,
      childsName,
      instituteId,
      busId,
      pickupLocation,
      fcmToken,
      phoneNo,
      ChildsRollNo,
      ChildsClass,
      ChildsSection,
      password,
    } = req.body;

    // Validate required fields
    if (
      !parentName ||
      !childsName ||
      !instituteId ||
      !busId ||
      !pickupLocation ||
      !fcmToken ||
      !phoneNo ||
      !ChildsRollNo ||
      !ChildsClass ||
      !ChildsSection ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate pickupLocation structure
    if (
      typeof pickupLocation !== "object" ||
      pickupLocation.lat === undefined ||
      pickupLocation.lng === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "pickupLocation must be an object with lat and lng",
      });
    }

    // Check if Parent is already registered
    const parentExist = await Parent.findOne({ phoneNo });
    if (parentExist) {
      return res.status(409).json({
        success: false,
        message: "Parent is already registered with this phone number",
      });
    }

    // Save Parent (Mongoose pre-save hook handles hashing the password)
    const newParent = new Parent({
      parentName,
      childsName,
      instituteId,
      busId,
      pickupLocation,
      fcmToken,
      phoneNo,
      ChildsRollNo,
      ChildsClass,
      ChildsSection,
      password,
    });

    await newParent.save();

    return res.status(201).json({
      success: true,
      message: "Parent registered successfully",
      data: {
        id: newParent._id,
        parentName: newParent.parentName,
        phoneNo: newParent.phoneNo,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getParentsByInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const parents = await Parent.find({ instituteId }).select("-password");

    return res.status(200).json({
      success: true,
      count: parents.length,
      parents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getParentsByBus = async (req, res) => {
  try {
    const { busId } = req.params;

    const parents = await Parent.find({ busId }).select("-password");

    return res.status(200).json({
      success: true,
      count: parents.length,
      parents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const updatedInfo = req.body;

    const parent = await Parent.findByIdAndUpdate(
      parentId,
      updatedInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Info Updated!",
      parent,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    const parent = await Parent.findByIdAndDelete(parentId);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parent deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.parentLogin = async (req, res) => {
  try {
    const { phoneNo, password } = req.body;

    if (!phoneNo || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required",
      });
    }

    const parent = await Parent.findOne({ phoneNo });
    if (!parent) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    const isPasswordValid = await parent.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    const accessToken = jwt.sign(
      {
        id: parent._id,
        role: "parent",
        instituteId: parent.instituteId,
        busId: parent.busId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { id: parent._id, role: "parent" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const parentResponse = parent.toObject();
    delete parentResponse.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      parent: parentResponse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.parentRefreshToken = async (req, res) => {
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

    const parent = await Parent.findById(decoded.id);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: parent._id,
        role: "parent",
        instituteId: parent.instituteId,
        busId: parent.busId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const newRefreshToken = jwt.sign(
      { id: parent._id, role: "parent" },
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
