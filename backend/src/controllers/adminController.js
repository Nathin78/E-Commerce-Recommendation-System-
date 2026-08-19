const { state, getPersistedUsers, saveToDisk, sanitizeCoupon } = require("../data/store");
const { asyncHandler, createError } = require("../utils/helpers");

const getUsers = asyncHandler(async (_req, res) => {
  const users = await getPersistedUsers();
  return res.json({ users });
});

const getAllOrders = asyncHandler(async (_req, res) => {
  return res.json({ orders: state.orders });
});

const getCoupons = asyncHandler(async (_req, res) => {
  return res.json({ coupons: state.coupons.map((coupon) => sanitizeCoupon(coupon)) });
});

const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!code) {
    throw createError("Coupon code is required", 400);
  }
  if (state.coupons.some((coupon) => coupon.code === code)) {
    throw createError("Coupon code already exists", 409);
  }

  const coupon = {
    code,
    description: String(req.body?.description || "").trim(),
    type: req.body?.type === "flat" ? "flat" : "percentage",
    value: Number(req.body?.value || 0),
    minSubtotal: Number(req.body?.minSubtotal || 0),
    maxDiscount: Number(req.body?.maxDiscount || 0),
    isActive: req.body?.isActive !== false
  };

  state.coupons.push(coupon);
  saveToDisk();
  return res.status(201).json({ coupon: sanitizeCoupon(coupon) });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const coupon = state.coupons.find((entry) => entry.code === code);
  if (!coupon) {
    throw createError("Coupon not found", 404);
  }

  if (req.body.description !== undefined) coupon.description = String(req.body.description || "").trim();
  if (req.body.type !== undefined) coupon.type = req.body.type === "flat" ? "flat" : "percentage";
  if (req.body.value !== undefined) coupon.value = Number(req.body.value || 0);
  if (req.body.minSubtotal !== undefined) coupon.minSubtotal = Number(req.body.minSubtotal || 0);
  if (req.body.maxDiscount !== undefined) coupon.maxDiscount = Number(req.body.maxDiscount || 0);
  if (req.body.isActive !== undefined) coupon.isActive = Boolean(req.body.isActive);

  saveToDisk();
  return res.json({ coupon: sanitizeCoupon(coupon) });
});

const updateAdminOrderStatus = asyncHandler(async (req, res) => {
  const order = state.orders.find((entry) => entry.id === req.params.orderId);
  if (!order) {
    throw createError("Order not found", 404);
  }

  const status = String(req.body?.status || "").trim().toLowerCase();
  if (!status) {
    throw createError("Order status is required", 400);
  }

  order.status = status;
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status,
    note: String(req.body?.note || `Status updated to ${status}`).trim(),
    at: new Date().toISOString()
  });
  saveToDisk();

  return res.json({ order });
});

module.exports = { getUsers, getAllOrders, getCoupons, createCoupon, updateCoupon, updateAdminOrderStatus };
