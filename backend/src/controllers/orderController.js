const {
  state,
  getCartByUserId,
  getProductById,
  getActiveFlashSale,
  saveToDisk,
  newId,
  getCouponByCode,
  calculateCouponDiscount,
  sanitizeCoupon
} = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");
const { getIO } = require("../socket/socketManager");

const ORDER_STATUS_FLOW = ["confirmed", "packed", "shipped", "delivered"];

function createStatusEntry(status, note = "") {
  return {
    status,
    note,
    at: new Date().toISOString()
  };
}

function getOrderForUser(req, orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw createError("Order not found", 404);
  }
  if (req.user.role !== "admin" && order.userId !== req.user.id) {
    throw createError("You are not allowed to access this order", 403);
  }
  if (!Array.isArray(order.statusHistory) || !order.statusHistory.length) {
    order.statusHistory = [createStatusEntry(order.status || "confirmed", "Order placed successfully")];
  }
  return order;
}

function finalizeOrder(user, items, couponCode = null, options = {}) {
  const deliveryAddress = String(options.deliveryAddress || user.address || "").trim();
  const paymentMethod = String(options.paymentMethod || "Cash on Delivery").trim();
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) throw createError("A product in cart no longer exists", 400);

    const quantity = Math.floor(Number(item.quantity || 1));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw createError("quantity must be a positive integer", 400);
    }

    const size = String(item.size || product.sizes?.[0] || "M").trim().toUpperCase();
    if (!product.sizes?.includes(size)) {
      throw createError(`Invalid size selected for ${product.name}`, 400);
    }

    if (quantity > product.stock) {
      throw createError(`Insufficient stock for ${product.name}`, 400);
    }

    const activeSale = getActiveFlashSale(product.id);
    if (activeSale) {
      const left = activeSale.stockLimit - activeSale.sold;
      if (quantity > left) {
        throw createError(`Flash sale stock finished for ${product.name}`, 400);
      }
    }

    const price = activeSale ? activeSale.discountPrice : product.price;

    product.stock -= quantity;
    if (activeSale) {
      activeSale.sold += quantity;
    }

    const lineTotal = price * quantity;
    subtotal += lineTotal;

    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      size,
      quantity,
      unitPrice: price,
      lineTotal,
      usedFlashSale: Boolean(activeSale)
    });

    getIO().emit("stock:update", {
      productId: product.id,
      stock: product.stock,
      flashSaleRemaining: activeSale ? Math.max(0, activeSale.stockLimit - activeSale.sold) : null
    });

    if (activeSale && activeSale.stockLimit - activeSale.sold <= 3) {
      getIO().emit("stock:low", {
        productId: product.id,
        left: Math.max(0, activeSale.stockLimit - activeSale.sold)
      });
    }
  }

  const coupon = getCouponByCode(couponCode);
  const discount = calculateCouponDiscount(coupon, subtotal);
  const total = Math.max(0, subtotal - discount);

  const order = {
    id: newId("o"),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    deliveryAddress,
    paymentMethod,
    items: orderItems,
    subtotal,
    discount,
    total,
    appliedCoupon: coupon ? sanitizeCoupon(coupon) : null,
    createdAt: new Date().toISOString(),
    status: "confirmed",
    statusHistory: [createStatusEntry("confirmed", "Order placed successfully")],
    cancellationRequestedAt: null,
    returnRequestedAt: null,
    returnReason: ""
  };

  state.orders.push(order);
  saveToDisk();

  getIO().emit("purchase:new", {
    orderId: order.id,
    items: order.items,
    userId: order.userId,
    userName: order.userName,
    total: order.total,
    createdAt: order.createdAt
  });

  getIO().emit("order:new", {
    id: order.id,
    userId: order.userId,
    userName: order.userName,
    userEmail: order.userEmail,
    items: order.items,
    total: order.total,
    createdAt: order.createdAt
  });

  return order;
}

const createOrder = asyncHandler(async (req, res) => {
  const cart = getCartByUserId(req.user.id);
  if (!cart.items.length) throw createError("Cart is empty", 400);
  const order = finalizeOrder(req.user, cart.items, cart.couponCode, {
    deliveryAddress: req.body?.deliveryAddress,
    paymentMethod: req.body?.paymentMethod
  });
  cart.items = [];
  cart.couponCode = null;
  saveToDisk();

  return res.status(201).json({ order });
});

const buyNow = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, size, couponCode, deliveryAddress, paymentMethod } = req.body;
  if (!productId) throw createError("productId is required", 400);

  const product = getProductById(productId);
  if (!product) throw createError("Product not found", 404);

  const order = finalizeOrder(req.user, [{ productId, quantity, size }], couponCode, {
    deliveryAddress,
    paymentMethod
  });
  return res.status(201).json({ order });
});

const getOrders = asyncHandler(async (req, res) => {
  if (req.user.role === "admin") {
    return res.json({ orders: state.orders });
  }

  const orders = state.orders.filter((order) => order.userId === req.user.id);
  return res.json({ orders });
});

const requestOrderCancellation = asyncHandler(async (req, res) => {
  const order = getOrderForUser(req, req.params.orderId);

  if (!["confirmed", "packed"].includes(order.status)) {
    throw createError("This order can no longer be cancelled", 400);
  }

  order.status = "cancelled";
  order.cancellationRequestedAt = new Date().toISOString();
  order.statusHistory.push(createStatusEntry("cancelled", "Cancelled by customer"));
  saveToDisk();

  return res.json({ order, message: "Order cancelled successfully" });
});

const requestOrderReturn = asyncHandler(async (req, res) => {
  const order = getOrderForUser(req, req.params.orderId);
  const reason = String(req.body?.reason || "").trim();

  if (order.status !== "delivered") {
    throw createError("Return request is available only after delivery", 400);
  }

  if (!reason) {
    throw createError("Return reason is required", 400);
  }

  order.status = "return_requested";
  order.returnRequestedAt = new Date().toISOString();
  order.returnReason = reason;
  order.statusHistory.push(createStatusEntry("return_requested", `Return requested: ${reason}`));
  saveToDisk();

  return res.json({ order, message: "Return request submitted successfully" });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = getOrderForUser(req, req.params.orderId);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();
  const note = String(req.body?.note || "").trim();

  if (!ORDER_STATUS_FLOW.includes(nextStatus) && !["cancelled", "return_requested", "returned"].includes(nextStatus)) {
    throw createError("Invalid order status", 400);
  }

  order.status = nextStatus;
  order.statusHistory.push(createStatusEntry(nextStatus, note || `Status updated to ${nextStatus}`));

  if (nextStatus === "delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date().toISOString();
  }

  saveToDisk();
  return res.json({ order, message: "Order status updated successfully" });
});

module.exports = { createOrder, buyNow, getOrders, requestOrderCancellation, requestOrderReturn, updateOrderStatus };
