require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");

const connectDB = require("./config/db");
require("./config/oauth");
const { initializeSocketHandlers } = require("./socket");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const userRoutes = require("./routes/userRoutes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();
const server = http.createServer(app);

// ✅ Corrected CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173", // ✅ Use your frontend URL, NOT "*"
    credentials: true, // ✅ Allows cookies/sessions to be sent
  })
);

// Middleware
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Updated Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ✅ Explicitly allow frontend origin
    methods: ["GET", "POST"],
    credentials: true, // ✅ Required for authentication
  },
});
global.io = io;

// Database Connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/movie-stream", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/users", userRoutes);

// Initialize Socket handlers
initializeSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { io };
