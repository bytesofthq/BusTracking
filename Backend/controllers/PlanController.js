const Plan = require("../models/PlanModel");

exports.createPlan = async (req, res) => {
  try {
    const { name, price, interval, features } = req.body;

    // Validate required fields
    if (!name || price === undefined || !interval || !features) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!Array.isArray(features)) {
      return res.status(400).json({
        success: false,
        message: "features must be an array",
      });
    }

    // Check if Plan already exists
    const planExist = await Plan.findOne({ name });
    if (planExist) {
      return res.status(409).json({
        success: false,
        message: "Plan is already registered with this name",
      });
    }

    const newPlan = new Plan({
      name,
      price,
      interval,
      features,
    });

    await newPlan.save();

    return res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: {
        id: newPlan._id,
        name: newPlan.name,
        price: newPlan.price,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();

    return res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const updatedInfo = req.body;

    const plan = await Plan.findByIdAndUpdate(
      planId,
      updatedInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      plan,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await Plan.findByIdAndDelete(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
