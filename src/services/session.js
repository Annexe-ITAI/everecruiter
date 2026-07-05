import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET;

export function createSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifySession(token) {
  if (!token) throw new Error("Missing token");
  return jwt.verify(token, SECRET);
}
