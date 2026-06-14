const Institute = require("../models/InstituteModel");

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
