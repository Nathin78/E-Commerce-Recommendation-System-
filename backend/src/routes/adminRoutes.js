const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getUsers,
  getAllOrders,
  getCoupons,
  createCoupon,
  updateCoupon,
  updateAdminOrderStatus
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));
router.get("/users", getUsers);
router.get("/orders", getAllOrders);
router.put("/orders/:orderId/status", updateAdminOrderStatus);
router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:code", updateCoupon);

module.exports = router;
