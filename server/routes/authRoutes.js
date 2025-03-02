const express = require("express");
const passport = require("passport");
const { signup, login } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const User=require("../models/User")
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/signup", signup);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ _id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: "1d" });

  res.json({ token, user: { _id: user._id, name: user.name } });
  localStorage.setItem("token", res.data.token);

});


router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));
router.get("/google/callback",  passport.authenticate("google", {
  successRedirect: "http://localhost:5173/landing",
  failureRedirect: "http://localhost:5173/login",
}));


router.get("/protected", protect, (req, res) => {
  res.json({ message: "Access Granted", user: req.user });
});

module.exports = router;