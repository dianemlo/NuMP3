// import express from "express";
// import User from "../models/User.js";
const express = require("express");
const User = require("../models/User");

const router = express.Router();

// ❤️ LIKE something
router.post("/", async (req, res) => {
  try {
    const { userId, type, item } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (type === "song") {
      const exists = user.likedSongs.some(
        (s) => s.songId === item.songId
      );

      if (!exists) {
        user.likedSongs.push(item);
      }
    }

    if (type === "album") {
      const exists = user.likedAlbums.some(
        (a) => a.albumId.toString() === item.albumId
      );

      if (!exists) {
        user.likedAlbums.push(item);
      }
    }

    if (type === "profile") {
      const exists = user.likedProfiles.some(
        (p) => p.userId.toString() === item.userId
      );

      if (!exists) {
        user.likedProfiles.push(item);
      }
    }

    await user.save();

    res.json({ message: "Liked!", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error liking item" });
  }
});

// 💔 UNLIKE something
router.delete("/", async (req, res) => {
  try {
    const { userId, type, itemId } = req.body;

    const user = await User.findById(userId);

    if (type === "song") {
      user.likedSongs = user.likedSongs.filter(
        (s) => s.songId !== itemId
      );
    }

    if (type === "album") {
      user.likedAlbums = user.likedAlbums.filter(
        (a) => a.albumId.toString() !== itemId
      );
    }

    if (type === "profile") {
      user.likedProfiles = user.likedProfiles.filter(
        (p) => p.userId.toString() !== itemId
      );
    }

    await user.save();

    res.json({ message: "Unliked!", user });
  } catch (err) {
    res.status(500).json({ message: "Error unliking item" });
  }
});

// 🔍 Check if liked
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching likes" });
  }
});

// export default router;
module.exports = router;