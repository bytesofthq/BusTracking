require("dotenv").config();
const express = require('express');
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const otpRoutes = require("./routes/otpRoutes");
const studentRoutes = require("./routes/studentRoutes");
const instituteRoutes = require("./routes/InstituteRoutes");
const parentRoutes = require("./routes/ParentRoutes");
const planRoutes = require("./routes/PlanRoutes");
const subscriptionRoutes = require("./routes/SubscriptionRoutes");
const attendanceRoutes = require("./routes/AttendanceRoutes");
const messageRoutes = require("./routes/messageRoutes");
const driverRoutes = require("./routes/driverRoutes");
const busRoutes = require("./routes/busRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const loggingMiddleware = require("./middlewares/loggingMiddleware");
const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;



const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  "http://localhost:5173",
  FRONTEND_URL,
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per IP
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(loggingMiddleware);
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});



// Routes
app.use("/api/otp", otpRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/institute", instituteRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/notification", notificationRoutes);





//socket.io 
io.on('connection', (socket) => {
  console.log('connected', socket.id);

  socket.on('join_room', (busId) => {
    socket.join(busId);
    console.log(`User ${socket.id} joined room ${busId}`);
  });

  socket.on('sendInfo', (information) => {
    let { name, busId, lat, lng } = information;
    console.log("Received info:", information);

    lat = Number(lat);
    lng = Number(lng);

    if (!busId || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.log("Invalid payload received:", information);
      return;
    }

    io.to(busId).emit('receiveInfo', { name, busId, lat, lng });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Global error handling middleware (must be registered last)
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

