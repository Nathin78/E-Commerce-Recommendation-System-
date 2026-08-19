const jwt = require("jsonwebtoken");
const { state, sanitizeUser, saveToDisk, enrichProduct, newId } = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");

function getUserFromState(userId) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) {
    throw createError("User not found", 404);
  }
  if (!Array.isArray(user.addresses)) {
    user.addresses = [];
  }
  if (!Object.prototype.hasOwnProperty.call(user, "defaultAddressId")) {
    user.defaultAddressId = user.addresses.find((address) => address.isDefault)?.id || null;
  }
  return user;
}

const getWishlist = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const wishlistProducts = (user?.wishlist || [])
    .map((productId) => state.products.find((p) => p.id === productId))
    .filter(Boolean);

  return res.json({ wishlist: wishlistProducts.map(enrichProduct) });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  return res.json({ user: sanitizeUser(user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const { name, email, address, phone } = req.body;
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedAddress = String(address || "").trim();
  const normalizedPhone = String(phone || "").trim();

  if (!normalizedName || !normalizedEmail || !normalizedAddress) {
    throw createError("Name, email, and address are required", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw createError("Please enter a valid email address", 400);
  }

  const existing = state.users.find((entry) => entry.email.toLowerCase() === normalizedEmail && entry.id !== user.id);
  if (existing) {
    throw createError("Email already in use", 409);
  }

  user.name = normalizedName;
  user.email = normalizedEmail;
  user.address = normalizedAddress;
  user.phone = normalizedPhone;

  const defaultAddress = user.addresses.find((entry) => entry.id === user.defaultAddressId) || user.addresses[0];
  if (defaultAddress) {
    defaultAddress.recipient = user.name;
    defaultAddress.mobile = user.phone;
    if (!defaultAddress.street) {
      defaultAddress.street = user.address;
    }
  }

  saveToDisk();

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({ user: sanitizeUser(user), token });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw createError("productId is required", 400);

  const user = getUserFromState(req.user.id);
  const productExists = state.products.some((p) => p.id === productId);
  if (!productExists) throw createError("Product not found", 404);

  if (!user.wishlist.includes(productId)) {
    user.wishlist.push(productId);
    saveToDisk();
  }

  return res.json({ user: sanitizeUser(user) });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = getUserFromState(req.user.id);
  user.wishlist = user.wishlist.filter((id) => id !== productId);
  saveToDisk();

  return res.json({ user: sanitizeUser(user) });
});

const getAddresses = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  return res.json({
    addresses: user.addresses || [],
    defaultAddressId: user.defaultAddressId || null
  });
});

function buildAddressPayload(input, fallbackLabel) {
  return {
    label: String(input.label || fallbackLabel).trim(),
    recipient: String(input.recipient || "").trim(),
    mobile: String(input.mobile || "").trim(),
    street: String(input.street || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim(),
    pincode: String(input.pincode || "").trim(),
    isDefault: Boolean(input.isDefault)
  };
}

const addAddress = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const address = buildAddressPayload(req.body, `Address ${user.addresses.length + 1}`);

  if (!address.recipient || !address.street || !address.city || !address.state || !address.pincode) {
    throw createError("Recipient, street, city, state, and pincode are required", 400);
  }

  if (address.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  const nextAddress = {
    id: newId("addr"),
    ...address,
    isDefault: Boolean(address.isDefault || !user.addresses.length)
  };

  user.addresses.push(nextAddress);
  if (nextAddress.isDefault) {
    user.defaultAddressId = nextAddress.id;
  }

  saveToDisk();
  return res.status(201).json({
    addresses: user.addresses,
    defaultAddressId: user.defaultAddressId
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const existing = user.addresses.find((entry) => entry.id === req.params.addressId);
  if (!existing) {
    throw createError("Address not found", 404);
  }

  const nextAddress = buildAddressPayload(req.body, existing.label || "Address");
  if (!nextAddress.recipient || !nextAddress.street || !nextAddress.city || !nextAddress.state || !nextAddress.pincode) {
    throw createError("Recipient, street, city, state, and pincode are required", 400);
  }

  Object.assign(existing, nextAddress);
  if (nextAddress.isDefault) {
    user.addresses.forEach((entry) => {
      entry.isDefault = entry.id === existing.id;
    });
    user.defaultAddressId = existing.id;
  } else if (user.defaultAddressId === existing.id) {
    existing.isDefault = true;
  }

  saveToDisk();
  return res.json({
    addresses: user.addresses,
    defaultAddressId: user.defaultAddressId
  });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const address = user.addresses.find((entry) => entry.id === req.params.addressId);
  if (!address) {
    throw createError("Address not found", 404);
  }

  user.addresses.forEach((entry) => {
    entry.isDefault = entry.id === address.id;
  });
  user.defaultAddressId = address.id;
  saveToDisk();

  return res.json({
    addresses: user.addresses,
    defaultAddressId: user.defaultAddressId
  });
});

const removeAddress = asyncHandler(async (req, res) => {
  const user = getUserFromState(req.user.id);
  const existing = user.addresses.find((entry) => entry.id === req.params.addressId);
  if (!existing) {
    throw createError("Address not found", 404);
  }

  user.addresses = user.addresses.filter((entry) => entry.id !== req.params.addressId);
  if (user.defaultAddressId === req.params.addressId) {
    user.defaultAddressId = user.addresses[0]?.id || null;
    user.addresses.forEach((entry, index) => {
      entry.isDefault = index === 0;
    });
  }

  saveToDisk();
  return res.json({
    addresses: user.addresses,
    defaultAddressId: user.defaultAddressId
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress
};
