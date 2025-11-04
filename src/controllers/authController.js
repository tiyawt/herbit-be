// src/controllers/authController.js
import { ok, fail } from "../utils/response.js";
import { registerUser, loginUser, me } from "../services/authService.js";

// NOTE: FE & BE beda domain -> sameSite:"none" + secure:true (on https)
const cookieOptsBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Vercel: true
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};
const COOKIE_NAME = "token";

export async function register(req, res) {
  try {
    const { email, username, phone_number, password } = req.body;
    const result = await registerUser({ email, username, phone_number, password });
    return ok(res, { user: result.user ?? result }, "Registered", 201);
  } catch (e) {
    if (e.message === "EMAIL_OR_USERNAME_TAKEN") {
      return fail(res, e.message, "Email atau username sudah dipakai", 409);
    }
    return fail(res, "REGISTER_ERROR", e.message, 400);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    // result = { user, token }

    // 1) Set cookie httpOnly (SSR/cross-site friendly)
    res.cookie(COOKIE_NAME, result.token, cookieOptsBase);

    // 2) Return token di body (buat FE-mu yang pakai Bearer/localStorage)
    return ok(
      res,
      {
        user: result.user,
        token: result.token,
      },
      "Logged in"
    );
  } catch (e) {
    if (e.message === "INVALID_CREDENTIALS") {
      return fail(res, e.message, "Email atau password salah", 401);
    }
    return fail(res, "LOGIN_ERROR", e.message, 400);
  }
}

export async function getMe(req, res) {
  try {
    const userData = await me(req.user.id);
    return ok(res, userData);
  } catch (e) {
    if (e.message === "User not found") {
      return fail(res, "USER_NOT_FOUND", "User tidak ditemukan", 404);
    }
    return fail(res, "ME_ERROR", e.message, 400);
  }
}

export async function logout(req, res) {
  // Hapus cookie dengan opsi yang sama (path/sameSite/secure) + maxAge 0
  res.clearCookie(COOKIE_NAME, {
    ...cookieOptsBase,
    maxAge: 0,
  });
  return ok(res, null, "Logged out");
}
