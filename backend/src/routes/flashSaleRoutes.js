const express = require("express");
const { getFlashSales, createFlashSale, deleteFlashSale } = require("../controllers/flashSaleController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", getFlashSales);
router.post("/", authMiddleware, requireRole("admin"), createFlashSale);
router.delete("/:saleId", authMiddleware, requireRole("admin"), deleteFlashSale);

module.exports = router;
