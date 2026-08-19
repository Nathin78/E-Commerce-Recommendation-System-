const {
  state,
  enrichProduct,
  getCanonicalCategory,
  getProductById,
  saveToDisk,
  newId,
  getActiveFlashSale,
  normalizeProductSizes,
  getReviewsForProduct,
  getProductRatingSummary
} = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");
const { getIO } = require("../socket/socketManager");

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

function normalizeReferenceImages(referenceImages, fallback) {
  if (Array.isArray(referenceImages)) {
    const cleaned = referenceImages
      .map((item) => String(item).trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [fallback];
  }
  if (typeof referenceImages === "string") {
    const cleaned = referenceImages
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [fallback];
  }
  return [fallback];
}

function hasUserPurchasedProduct(userId, productId) {
  return state.orders.some(
    (order) => order.userId === userId && Array.isArray(order.items) && order.items.some((item) => item.productId === productId)
  );
}

function serializeReviews(productId) {
  return getReviewsForProduct(productId).map((review) => {
    const user = state.users.find((entry) => entry.id === review.userId);
    return {
      ...review,
      userName: user?.name || "Verified Buyer"
    };
  });
}

const getProducts = asyncHandler(async (req, res) => {
  const products = dedupeById(state.products.map(enrichProduct));
  const trending = dedupeById([...products].sort((a, b) => b.views - a.views)).slice(0, 8);
  return res.json({ products, trending });
});

const getProductByIdController = asyncHandler(async (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) {
    throw createError("Product not found", 404);
  }

  const shouldTrackView = req.query.trackView !== "false";

  if (shouldTrackView) {
    product.views += 1;
    if (req.user?.id) {
      state.clicks.push({
        userId: req.user.id,
        productId: product.id,
        category: getCanonicalCategory(product),
        timestamp: new Date().toISOString()
      });
    }

    saveToDisk();
  }

  return res.json({
    product: enrichProduct(product),
    reviews: serializeReviews(product.id),
    canReview: req.user?.id ? hasUserPurchasedProduct(req.user.id, product.id) : false
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, stock, image, referenceImages, brand, sizes } = req.body;
  if (!name || !description || !category || price == null || stock == null) {
    throw createError("Missing product fields", 400);
  }

  const mainImage = image || "https://via.placeholder.com/640x480";
  const product = {
    id: newId("p"),
    name,
    description,
    category,
    brand: brand || "Generic",
    price: Number(price),
    stock: Number(stock),
    image: mainImage,
    referenceImages: normalizeReferenceImages(referenceImages, mainImage),
    sizes: normalizeProductSizes(sizes),
    views: 0
  };
  product.category = getCanonicalCategory(product);

  state.products.push(product);
  saveToDisk();
  getIO().emit("product:created", enrichProduct(product));

  return res.status(201).json({ product: enrichProduct(product) });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) {
    throw createError("Product not found", 404);
  }

  const updatableFields = ["name", "description", "category", "brand", "price", "stock", "image", "sizes"];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "price" || field === "stock") {
        product[field] = Number(req.body[field]);
      } else if (field === "sizes") {
        product.sizes = normalizeProductSizes(req.body.sizes);
      } else {
        product[field] = req.body[field];
      }
    }
  });
  product.category = getCanonicalCategory(product);
  product.sizes = normalizeProductSizes(product.sizes);
  if (req.body.referenceImages !== undefined) {
    product.referenceImages = normalizeReferenceImages(req.body.referenceImages, product.image);
  } else if (!Array.isArray(product.referenceImages) || !product.referenceImages.length) {
    product.referenceImages = [product.image];
  }

  saveToDisk();
  getIO().emit("product:updated", enrichProduct(product));

  return res.json({ product: enrichProduct(product) });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productIndex = state.products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) {
    throw createError("Product not found", 404);
  }

  const [deleted] = state.products.splice(productIndex, 1);
  state.flashSales = state.flashSales.filter((sale) => sale.productId !== deleted.id);
  state.carts.forEach((cart) => {
    cart.items = cart.items.filter((item) => item.productId !== deleted.id);
  });

  saveToDisk();
  getIO().emit("product:deleted", { id: deleted.id });

  return res.json({ message: "Product deleted" });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userClicks = state.clicks.filter((c) => c.userId === userId);

  const mostViewed = [...state.products].sort((a, b) => b.views - a.views).slice(0, 4);

  let categoryRecommendations = [];
  if (userClicks.length) {
    const latest = userClicks[userClicks.length - 1];
    categoryRecommendations = state.products
      .filter((p) => getCanonicalCategory(p) === latest.category && p.id !== latest.productId)
      .slice(0, 4);
  }

  return res.json({
    recommendations: dedupeById([...mostViewed, ...categoryRecommendations].map(enrichProduct))
  });
});

const getProductPriceInfo = (productId) => {
  const product = getProductById(productId);
  if (!product) throw createError("Product not found", 404);
  const sale = getActiveFlashSale(productId);
  const salePrice = sale ? sale.discountPrice : product.price;
  return { product, sale, finalPrice: salePrice };
};

const addProductReview = asyncHandler(async (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) {
    throw createError("Product not found", 404);
  }

  if (!hasUserPurchasedProduct(req.user.id, product.id)) {
    throw createError("You can review only products you have purchased", 403);
  }

  const rating = Math.floor(Number(req.body.rating));
  const comment = String(req.body.comment || "").trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createError("rating must be an integer between 1 and 5", 400);
  }

  if (!comment) {
    throw createError("comment is required", 400);
  }

  const existing = state.reviews.find((review) => review.productId === product.id && review.userId === req.user.id);
  const timestamp = new Date().toISOString();

  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.updatedAt = timestamp;
  } else {
    state.reviews.push({
      id: newId("r"),
      productId: product.id,
      userId: req.user.id,
      rating,
      comment,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  saveToDisk();
  getIO().emit("product:updated", enrichProduct(product));

  return res.status(existing ? 200 : 201).json({
    product: enrichProduct(product),
    reviews: serializeReviews(product.id),
    ratingSummary: getProductRatingSummary(product.id)
  });
});

module.exports = {
  getProducts,
  getProductByIdController,
  createProduct,
  updateProduct,
  deleteProduct,
  getRecommendations,
  getProductPriceInfo,
  addProductReview
};
