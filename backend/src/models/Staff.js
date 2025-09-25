// backend/models/Staff.js
const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  staffId: { type: String, unique: true, required: true },
  department: { type: String, required: true },
  role: { type: String, required: true },
  shift: { type: String, default: "Day Shift (8:00 AM - 4:00 PM)" },
  badge: { type: String, required: true },
  avatar: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Staff", staffSchema);