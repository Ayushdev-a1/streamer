require("dotenv").config();
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const connectDB = require("./config/db");
require("./config/oauth");

connectDB();

const app = express();
app.use(
    cors({
      origin: "http://localhost:5173", 
      credentials: true, 
      methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
app.use(express.json());
app.use(session({ secret: "mysecret", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
// Routes
app.use("/auth", require("./routes/authRoutes"));
const roomRoutes = require("./routes/roomRoutes");
app.use("/rooms", roomRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));