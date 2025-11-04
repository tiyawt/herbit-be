// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = bearer || req.cookies?.token; // match COOKIE_NAME

  if (!token) {
    return res.status(401).json({ message: "Missing token (Bearer or cookie)" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}


export function adminRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const tokenHeader = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : null;
  const tokenCookie = req.cookies?.access_token || null;
  const token = tokenHeader || tokenCookie;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", details: "Missing token" },
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", details: "Admin access required" },
      });
    }

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", details: e.message },
    });
  }
}
