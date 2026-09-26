import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "../models/User.js";
import { createAppError } from "../utils/createAppError.js";

const authHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw createAppError("Authentication required.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!process.env.JWT_SECRET) {
    throw createAppError("JWT secret is not configured.", 500);
  }

  if (!token) {
    throw createAppError("Invalid authentication token.", 401);
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw createAppError("Invalid or expired authentication token.", 401);
  }

  if (
    typeof decodedToken !== "object" ||
    !decodedToken.userId ||
    !mongoose.isValidObjectId(decodedToken.userId)
  ) {
    throw createAppError("Invalid authentication token.", 401);
  }

  const user = await User.findById(decodedToken.userId).select("_id");

  if (!user) {
    throw createAppError("User account not found.", 401);
  }

  req.user = { userId: user._id.toString() };
  next();
};

export default authHandler;
