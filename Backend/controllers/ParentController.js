const Parent = require("../models/ParentModel");

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
