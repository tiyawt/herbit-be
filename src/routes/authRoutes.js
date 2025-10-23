import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { register, login, getMe } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { requireBody, validateRegister } from "../utils/validators.js";

const router = Router();

// Register / Login
router.post(
  "/register",
  requireBody(["email", "username", "password", "confirm_password"]),
  validateRegister(),
  register
);
router.post("/login", requireBody(["email", "password"]), login);
router.get("/me", authRequired, getMe);

// ===== Google OAuth =====

// Step 1: Redirect ke Google
router.get(
  "/oauth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Callback dari Google → bikin JWT, choose your redirect
router.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/oauth-failed",
  }),
  (req, res) => {
    // Issue JWT
    const token = jwt.sign(
      { id: req.user._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // redirect ke FE dengan token sebagai query
    const redirect = `${
      process.env.CLIENT_APP_URL || "http://localhost:3000"
    }/oauth-callback?token=${token}`;
    return res.redirect(redirect);
  }
);

export default router;
