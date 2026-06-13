require("dotenv").config();
const express = require('express');
const mongoose = require("mongoose");
const otpRoutes = require("./routes/otpRoutes");
const studentRoutes = require("./routes/studentRoutes");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 4000;


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per IP
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(limiter);
app.use(express.json());



// Routes
app.use("/api/otp", otpRoutes);
app.use("/api/student", studentRoutes);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

