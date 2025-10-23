import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema({
  email:      { type: String, required: true, unique: true, lowercase: true, index: true, trim: true },
  username:   { type: String, required: true, unique: true, trim: true },
  phone_number:{ type: String, default: null, trim: true },
  photo_url:  { type: String, default: null },
  pre_points:   { type: Number, default: 0 },
  total_points: { type: Number, default: 0 },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export default mongoose.model("User", userSchema, "users");
