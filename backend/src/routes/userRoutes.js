const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/userController");

const router = express.Router();

router.use(authMiddleware);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/addresses", getAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.put("/addresses/:addressId/default", setDefaultAddress);
router.delete("/addresses/:addressId", removeAddress);
router.get("/wishlist", getWishlist);
router.post("/wishlist", addToWishlist);
router.delete("/wishlist/:productId", removeFromWishlist);

module.exports = router;
