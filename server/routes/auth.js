// Registration and sign-in. Passwords are hashed with scrypt before they reach
// the database; register_user() applies the account rules.
import { Router } from "express";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "../db.js";
import { badRequest, route } from "../http.js";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, keyHex] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

const publicUser = (row) => ({
  user_id: row.user_id,
  full_name: row.full_name,
  email: row.email,
  skill_level: row.skill_level,
});

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  route(async (req, res) => {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!name) return badRequest(res, "Name is required");
    if (!EMAIL_PATTERN.test(email)) return badRequest(res, "Enter a valid email");
    if (password.length < 8) {
      return badRequest(res, "Password must be at least 8 characters");
    }

    const hash = await hashPassword(password);
    const created = await query(
      "SELECT register_user($1, $2, $3) AS user_id",
      [name, email, hash]
    );
    const { rows } = await query("SELECT * FROM users WHERE user_id = $1", [
      created.rows[0].user_id,
    ]);
    res.status(201).json(publicUser(rows[0]));
  })
);

authRouter.post(
  "/auth/login",
  route(async (req, res) => {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    if (!email || !password) return badRequest(res, "Email and password are required");

    const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
    const valid = rows.length > 0 && (await verifyPassword(password, rows[0].password_hash));
    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    res.json(publicUser(rows[0]));
  })
);
