const {
  getCartByUserId,
  getProductById,
  getActiveFlashSale,
  saveToDisk,
  getCouponByCode,
  calculateCouponDiscount,
  sanitizeCoupon,
  state
} = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");

function buildCartResponse(userId) {
  const cart = getCartByUserId(userId);

  const items = cart.items.map((item) => {
    const product = getProductById(item.productId);
    if (!product) return null;
    const sale = getActiveFlashSale(product.id);
    const unitPrice = sale ? sale.discountPrice : product.price;
    const size = item.size || product.sizes?.[0] || "M";
    return {
      ...item,
      size,
      product,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      flashSale: sale
    };
  }).filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const coupon = getCouponByCode(cart.couponCode);
  const discount = calculateCouponDiscount(coupon, subtotal);
  const total = Math.max(0, subtotal - discount);

  return {
    items,
    subtotal,
    discount,
    total,
    appliedCoupon: coupon ? sanitizeCoupon(coupon) : null
  };
}

const getCart = asyncHandler(async (req, res) => {
  const cart = buildCartResponse(req.user.id);
  return res.json({ cart });
});

const updateCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, action = "add", size } = req.body;

  const cart = getCartByUserId(req.user.id);

  if (action === "clear") {
    cart.items = [];
    cart.couponCode = null;
    saveToDisk();
    return res.json({ cart: buildCartResponse(req.user.id), message: "Cart cleared" });
  }

  if (!productId) throw createError("productId is required", 400);

  const product = getProductById(productId);
  if (!product) throw createError("Product not found", 404);
  const selectedSize = String(size || product.sizes?.[0] || "M").trim().toUpperCase();
  if (!product.sizes?.includes(selectedSize)) {
    throw createError("Invalid size selected", 400);
  }

  const existing = cart.items.find((item) => item.productId === productId && String(item.size || selectedSize).toUpperCase() === selectedSize);
  const parsedQuantity = Math.floor(Number(quantity));

  if (action === "remove") {
    cart.items = cart.items.filter((item) => !(item.productId === productId && String(item.size || selectedSize).toUpperCase() === selectedSize));
  } else {
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      throw createError("quantity must be a positive integer", 400);
    }

    const sale = getActiveFlashSale(productId);
    const saleRemaining = sale ? Math.max(0, sale.stockLimit - sale.sold) : Infinity;
    const allowedMax = Math.min(product.stock, saleRemaining);

    if (allowedMax <= 0) {
      throw createError("Product is out of stock", 400);
    }

    if (!existing && action === "add") {
      if (parsedQuantity > allowedMax) {
        throw createError(`Only ${allowedMax} item(s) available`, 400);
      }
      cart.items.push({ productId, quantity: parsedQuantity, size: selectedSize });
    } else if (existing && action === "add") {
      const nextQuantity = existing.quantity + parsedQuantity;
      if (nextQuantity > allowedMax) {
        throw createError(`Only ${allowedMax} item(s) available`, 400);
      }
      existing.quantity = nextQuantity;
    } else if (existing && action === "decrement") {
      existing.quantity = Math.max(1, existing.quantity - parsedQuantity);
    } else if (existing) {
      if (parsedQuantity > allowedMax) {
        throw createError(`Only ${allowedMax} item(s) available`, 400);
      }
      existing.quantity = parsedQuantity;
    } else {
      throw createError("Item is not in cart", 400);
    }
  }

  saveToDisk();
  return res.json({ cart: buildCartResponse(req.user.id) });
});

const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cart = getCartByUserId(req.user.id);

  if (!code || !String(code).trim()) {
    cart.couponCode = null;
    saveToDisk();
    return res.json({ cart: buildCartResponse(req.user.id), message: "Coupon removed" });
  }

  const coupon = getCouponByCode(code);
  if (!coupon) {
    throw createError("Coupon code is invalid or inactive", 404);
  }

  const draftCart = buildCartResponse(req.user.id);
  if (!draftCart.items.length) {
    throw createError("Add items to cart before applying a coupon", 400);
  }

  const discount = calculateCouponDiscount(coupon, draftCart.subtotal);
  if (!discount) {
    throw createError(`Cart total must be at least ${coupon.minSubtotal} to use ${coupon.code}`, 400);
  }

  cart.couponCode = coupon.code;
  saveToDisk();
  return res.json({ cart: buildCartResponse(req.user.id), message: `${coupon.code} applied successfully` });
});

const getOffers = asyncHandler(async (_req, res) => {
  const offers = state.coupons
    .filter((coupon) => coupon.isActive)
    .map((coupon) => sanitizeCoupon(coupon));

  return res.json({ offers });
});

module.exports = { getCart, updateCart, applyCoupon, getOffers };
