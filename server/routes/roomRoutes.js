const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Room = require("../models/Room");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// ✅ Create a Room
router.post("/create", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Room name is required" });

    const inviteLink = `http://localhost:5173/join-room/${uuidv4()}`;

    const newRoom = new Room({
      name,
      host: req.user._id,
      inviteLink,
    });

    await newRoom.save();

    res.status(201).json({
      message: "Room created successfully",
      room: newRoom,
      host: req.user.name, 
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ Get Room by ID
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("host", "name email");
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Error fetching room", error });
  }
});

module.exports = router;
