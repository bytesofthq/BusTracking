const Subscription = require("../models/SubscriptionModel");

exports.createSubscription = async (req, res) => {
  try {
    const { instituteId, planId, status, startDate, endDate } = req.body;

    // Validate required fields
    if (!instituteId || !planId || !status || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newSubscription = new Subscription({
      instituteId,
      planId,
      status,
      startDate,
      endDate,
    });

    await newSubscription.save();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        id: newSubscription._id,
        instituteId: newSubscription.instituteId,
        planId: newSubscription.planId,
        status: newSubscription.status,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getSubscriptionsByInstitute = async (req, res) => {
  try {
    const { instituteId } = req.params;

    const subscriptions = await Subscription.find({ instituteId })
      .populate({ path: "planId", model: "Plan" });

    return res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getSubscriptionById = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId)
      .populate({ path: "planId", model: "Plan" })
      .populate({ path: "instituteId", model: "Institute" });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      subscription,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const updatedInfo = req.body;

    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      updatedInfo,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      subscription,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findByIdAndDelete(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
