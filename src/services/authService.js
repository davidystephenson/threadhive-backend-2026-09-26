import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { createAppError } from "../utils/createAppError.js";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw createAppError("JWT secret is not configured.", 500);
  }

  return process.env.JWT_SECRET;
};

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const validateRegistrationInput = (name, email, password) => {
  const normalizedEmail = normalizeEmail(email);

  if (!name || typeof name !== "string" || !name.trim()) {
    throw createAppError("Name is required.", 400);
  }

  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw createAppError("A valid email is required.", 400);
  }

  if (typeof password !== "string" || password.length < 8) {
    throw createAppError("Password must be at least 8 characters long.", 400);
  }

  return {
    name: name.trim(),
    email: normalizedEmail,
    password,
  };
};

const createAuthResponse = (user) => {
  // { userId: abc123 }
  const token = jwt.sign({ userId: user._id.toString() }, getJwtSecret(), {
    expiresIn: "24h",
  });
  // eyj2384790234512134897601234skafjpowqer.90873245lkjas0poi234190q87aqs34908

  const userData = user.toObject();
  delete userData.password;

  return { token, user: userData };
};

export const registerUser = async (name, email, password) => {
  const userData = validateRegistrationInput(name, email, password);
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    throw createAppError("Email is already registered.", 409);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const user = await User.create({
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
  });

  return createAuthResponse(user);
};

export const loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof password !== "string" || !password) {
    throw createAppError("Email and password are required.", 400);
  }

  const user = await User.findOne({ email: normalizedEmail });
  const isPasswordValid = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!user || !isPasswordValid) {
    throw createAppError("Invalid email or password.", 401);
  }

  return createAuthResponse(user);
};
