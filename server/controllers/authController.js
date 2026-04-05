const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// cascade-delete helpers — only import what exists
let Plan, Schedule, Feedback;
try { Plan     = require('../models/Plan');     } catch {}
try { Schedule = require('../models/Schedule'); } catch {}
try { Feedback = require('../models/Feedback'); } catch {}

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: 'User already exists' });

    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password:   hashed,
      dailyHours: 5,
    });

    res.status(201).json({
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      dailyHours: user.dailyHours,
      token:      generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      dailyHours: user.dailyHours,
      token:      generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Update Profile (name + default daily hours) ───────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, dailyHours } = req.body;

    const updates = {};
    if (name) {
      if (name.trim().length < 2)
        return res.status(400).json({ message: 'Name must be at least 2 characters' });
      updates.name = name.trim();
    }
    if (dailyHours !== undefined) {
      const h = Number(dailyHours);
      if (isNaN(h) || h < 0.5 || h > 24)
        return res.status(400).json({ message: 'Daily hours must be between 0.5 and 24' });
      updates.dailyHours = h;
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: 'Nothing to update' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      dailyHours: user.dailyHours,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Change Password ───────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(400).json({ message: 'Current password is incorrect' });

    if (currentPassword === newPassword)
      return res.status(400).json({ message: 'New password must be different from current' });

    const salt   = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Delete Account ────────────────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password)
      return res.status(400).json({ message: 'Password is required to delete your account' });

    const user  = await User.findById(req.user.id);
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Incorrect password' });

    const userId = req.user.id;

    // Cascade delete — plans, schedules, feedback
    if (Plan)     await Plan.deleteMany({ user: userId });
    if (Schedule) await Schedule.deleteMany({ user: userId });
    if (Feedback) await Feedback.deleteMany({ user: userId });

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, deleteAccount };