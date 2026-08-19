const express = require("express");
const {
  createOrder,
  buyNow,
  getOrders,
  requestOrderCancellation,
  requestOrderReturn,
  updateOrderStatus
} = require("../controllers/orderController");
const requireRole = require("../middleware/roleMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.post("/buy-now", buyNow);
router.post("/", createOrder);
router.get("/", getOrders);
router.put("/:orderId/cancel", requestOrderCancellation);
router.put("/:orderId/return", requestOrderReturn);
router.put("/:orderId/status", requireRole("admin"), updateOrderStatus);

module.exports = router;
