const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { state, sanitizeUser, saveToDisk, newId } = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");

const register = asyncHandler(async (req, res) => {
  const { name, email, address, password } = req.body;

  if (!name || !email || !address || !password) {
    throw createError("Name, email, residential address and password are required", 400);
  }

  const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw createError("Email already in use", 409);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: newId("u"),
    name,
    email,
    address,
    phone: "",
    password: hashed,
    role: "user",
    wishlist: [],
    addresses: [
      {
        id: newId("addr"),
        label: "Home",
        recipient: name,
        mobile: "",
        street: address,
        city: "",
        state: "",
        pincode: "",
        isDefault: true
      }
    ],
    defaultAddressId: null
  };
  user.defaultAddressId = user.addresses[0].id;

  state.users.push(user);
  saveToDisk();

  return res.status(201).json({ user: sanitizeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }

  const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw createError("Invalid credentials", 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw createError("Invalid credentials", 401);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({ token, user: sanitizeUser(user) });
});

module.exports = { register, login };
