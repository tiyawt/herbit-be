import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const authCredentialSchema = new Schema(
  {
    user_id: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 credential per user
      index: true,
    },
    // Local auth
    password_hash: {
      type: String,
      default: null,
      select: false,
    },

    // OAuth fields
    provider: {
      type: String,
      enum: [null, "google"],
      default: null,
    },
    provider_id: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    // Forgot password fields
    reset_token: {
      type: String,
      default: null,
      select: false,
    },
    reset_token_expiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model(
  "AuthCredential",
  authCredentialSchema,
  "auth_credentials"
);
