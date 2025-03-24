const express = require("express");
const passport = require("passport");
const { signup } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const router = express.Router();

router.post("/signup", signup);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Assuming you want to use JWT here, but you can adjust as needed
  const token = jwt.sign({ _id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: "1d" });

  res.json({ token, user: { _id: user._id, name: user.name } });
});

router.get("/status", async (req, res) => {
  try {
    if (req.isAuthenticated() && req.user) {
      // Fetch the user from the database
      const user = await User.findOne({ googleId: req.user.googleId });
      if (!user) {
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user,
      });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    console.error("Auth status error:", error);
    res.json({ authenticated: false });
  }
});


router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
})); 

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "http://localhost:5173/login" }), 
  async (req, res) => {
    try {
      if (!req.user) {
        console.error("Google Auth Error:", err || info);
        return res.redirect("http://localhost:5173/login");
      }

      // Find existing user in database
      let existingUser = await User.findOne({ googleId: req.user.id });

      if (!existingUser) {
        // If user does not exist, create a new one
        existingUser = await User.create({
          googleId: req.user.id,
          name: req.user.displayName,
          email: req.user.emails[0].value,
          profilePic: req.user.photos[0].value,
        });
      }

      // Manually log in the user
      req.login(existingUser, (err) => {
        if (err) {
          return res.redirect("http://localhost:5173/login");
        }
        res.redirect("http://localhost:5173/landing");
      });
    } catch (error) {
      console.error("Google login error:", error);
      res.redirect("http://localhost:5173/login");
    }
  }
);


// Logout route
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.redirect("http://localhost:5173/login");
  });
});

router.get("/protected", protect, (req, res) => {
  res.json({ message: "Access Granted", user: req.user });
});

module.exports = router;