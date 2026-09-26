import { registerUser, loginUser } from "../services/authService.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body ?? {};
  const authData = await registerUser(name, email, password);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: authData,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};
  const authData = await loginUser(email, password);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: authData,
  });
};
