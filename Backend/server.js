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


// General API rate limiter with generous threshold for dashboard usage
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per 15 minutes for smooth real-time dashboard operations
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

// Stricter rate limiter specifically for auth/OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 attempts per 15 minutes
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});

app.use(loggingMiddleware);
app.use(cors(corsOptions));
app.use("/api/otp", authLimiter);
app.use(generalLimiter);
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});

// Cache of latest known locations for active buses
const latestBusLocations = {};

// Attach io and latest locations cache to all requests
app.use((req, res, next) => {
  req.io = io;
  req.latestBusLocations = latestBusLocations;
  next();
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

// Socket.IO real-time connection and rooms
io.on('connection', (socket) => {
  console.log('Client connected to Socket.IO:', socket.id);

  // Join room for a bus (supports both raw busId and bus-prefixed busId)
  socket.on('join_room', (busId) => {
    if (!busId) return;
    const cleanBusId = String(busId).replace(/^bus-/, '');
    socket.join(cleanBusId);
    socket.join(`bus-${cleanBusId}`);
    console.log(`User ${socket.id} joined rooms ${cleanBusId} and bus-${cleanBusId}`);

    // If we have a cached last known location for this bus, send immediately
    if (latestBusLocations[cleanBusId]) {
      socket.emit('receiveInfo', latestBusLocations[cleanBusId]);
    }
  });

  // Driver GPS info broadcast
  socket.on('sendInfo', (information) => {
    if (!information || typeof information !== 'object') return;
    let { name, busId, lat, lng, speed, heading, accuracy, status, tripId } = information;

    if (!busId) return;
    const cleanBusId = String(busId).replace(/^bus-/, '');

    lat = Number(lat);
    lng = Number(lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn("Invalid coordinates payload rejected:", information);
      return;
    }

    const payload = {
      name: name || "School Bus",
      busId: cleanBusId,
      lat,
      lng,
      speed: Number(speed) || 0,
      heading: Number(heading) || 0,
      accuracy: Number(accuracy) || 0,
      status: status || 'in_transit',
      tripId: tripId || null,
      timestamp: new Date().toISOString()
    };

    // Store in cache
    latestBusLocations[cleanBusId] = payload;

    // Broadcast to room subscribers (parents, students, admins)
    io.to(cleanBusId).to(`bus-${cleanBusId}`).emit('receiveInfo', payload);
  });

  socket.on('leave_room', (busId) => {
    if (!busId) return;
    const cleanBusId = String(busId).replace(/^bus-/, '');
    socket.leave(cleanBusId);
    socket.leave(`bus-${cleanBusId}`);
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

