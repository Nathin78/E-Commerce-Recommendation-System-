const express = require("express");
const { getCart, updateCart, applyCoupon, getOffers } = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/offers", getOffers);
router.get("/", getCart);
router.post("/", updateCart);
router.post("/coupon", applyCoupon);

module.exports = router;
