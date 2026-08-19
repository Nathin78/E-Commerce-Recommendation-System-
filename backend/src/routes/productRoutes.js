const express = require("express");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getProducts,
  getProductByIdController,
  createProduct,
  updateProduct,
  deleteProduct,
  getRecommendations,
  addProductReview
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.get("/recommendations", authMiddleware, getRecommendations);
router.post("/:id/reviews", authMiddleware, addProductReview);
router.get("/:id", authMiddlewareOptional, getProductByIdController);
router.post("/", authMiddleware, requireRole("admin"), createProduct);
router.put("/:id", authMiddleware, requireRole("admin"), updateProduct);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteProduct);

function authMiddlewareOptional(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_e) {
    req.user = undefined;
  }
  return next();
}

module.exports = router;
