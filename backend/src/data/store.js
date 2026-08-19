const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();
let mysql;
try {
  mysql = require("mysql2/promise");
} catch (error) {
  mysql = null;
}
const { v4: uuidv4 } = require("uuid");
const { bulkProducts } = require("./bulkProducts");

const DB_PATH = path.join(__dirname, "db.json");
const persistToFile = (process.env.PERSIST_TO_FILE || "true") === "true";
const useDatabase = (process.env.DB_ENABLED || "true") !== "false";
const DAILY_AUTO_FLASH_SALE_COUNT = 3;
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "flash_sale_ecommerce"
};

let pool = null;
let initPromise = null;
let databaseReady = false;
const DEFAULT_PRODUCT_SIZES = ["S", "M", "L", "XL", "XXL"];

const now = Date.now();
const oneHour = 60 * 60 * 1000;
const seedFlashSales = [
  {
    id: "fs1",
    productId: "p1",
    discountPrice: 24999,
    startTime: new Date(now - oneHour).toISOString(),
    endTime: new Date(now + oneHour * 3).toISOString(),
    stockLimit: 12,
    sold: 3
  },
  {
    id: "fs2",
    productId: "p3",
    discountPrice: 8999,
    startTime: new Date(now - oneHour / 2).toISOString(),
    endTime: new Date(now + oneHour * 2).toISOString(),
    stockLimit: 10,
    sold: 2
  }
];
const seedProducts = [
  {
    id: "p1",
    name: "Sony WH-1000XM5 Headphones",
    description: "Premium over-ear noise-cancelling headphones with long battery life and crisp call quality.",
    category: "Electronics",
    brand: "Sony",
    price: 29999,
    stock: 24,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p2",
    name: "Apple Watch Series 9",
    description: "Health and productivity smartwatch with bright display, fitness tracking, and seamless notifications.",
    category: "Electronics",
    brand: "Apple",
    price: 41999,
    stock: 18,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200",
      "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=1200",
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p3",
    name: "Nike Air Max 270",
    description: "Everyday lifestyle sneaker with visible cushioning and a clean streetwear look.",
    category: "Fashion",
    brand: "Nike",
    price: 12999,
    stock: 34,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200"
    ],
    sizes: ["7", "8", "9", "10", "11"],
    views: 0
  },
  {
    id: "p4",
    name: "Ceramic Coffee Set",
    description: "Four-piece handcrafted ceramic cup set with a smooth matte finish for home coffee rituals.",
    category: "Home",
    brand: "CozyNest",
    price: 2499,
    stock: 30,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200",
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p5",
    name: "JBL Charge 5 Speaker",
    description: "Portable water-resistant Bluetooth speaker with punchy bass and all-day battery backup.",
    category: "Electronics",
    brand: "JBL",
    price: 14999,
    stock: 42,
    image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=1200",
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1200",
      "https://images.unsplash.com/photo-1531104985437-603d6490e6d4?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p6",
    name: "Logitech G Pro Keyboard",
    description: "Compact mechanical keyboard with fast switches and a clean esports-inspired layout.",
    category: "Electronics",
    brand: "Logitech",
    price: 10999,
    stock: 28,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=1200",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200",
      "https://images.unsplash.com/photo-1595225476474-87563907a212?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p7",
    name: "Samsonite Travel Backpack",
    description: "Lightweight 35L travel backpack with padded laptop sleeve and smart compartments.",
    category: "Fashion",
    brand: "Samsonite",
    price: 8999,
    stock: 36,
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
      "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=1200",
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p8",
    name: "Philips Air Fryer XL",
    description: "Oil-free cooking with rapid air technology for quick meals and easy cleanup.",
    category: "Home",
    brand: "Philips",
    price: 16999,
    stock: 20,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200",
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=1200",
      "https://images.unsplash.com/photo-1556911220-bda9f7f7597e?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p9",
    name: "Ergo Office Chair",
    description: "Ergonomic chair with lumbar support for long work sessions and posture comfort.",
    category: "Home",
    brand: "UrbanLoft",
    price: 18999,
    stock: 16,
    image: "https://images.unsplash.com/photo-1596079890744-c1a0462d0975?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1596079890744-c1a0462d0975?w=1200",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200",
      "https://images.unsplash.com/photo-1503602642458-232111445657?w=1200"
    ],
    sizes: [],
    views: 0
  },
  {
    id: "p10",
    name: "Canon EOS R50 Kit",
    description: "Mirrorless camera kit with versatile lens, fast autofocus, and crisp content capture.",
    category: "Electronics",
    brand: "Canon",
    price: 68999,
    stock: 12,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200",
    referenceImages: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200",
      "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=1200"
    ],
    sizes: [],
    views: 0
  }
];

const state = {
  users: [
    {
      id: "u-admin",
      name: "Admin",
      email: "admin@flashsale.com",
      address: "Bengaluru, Karnataka",
      phone: "9000000001",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin",
      wishlist: [],
      addresses: [],
      defaultAddressId: null
    },
    {
      id: "u-user",
      name: "John User",
      email: "user@flashsale.com",
      address: "Chennai, Tamil Nadu",
      phone: "9876543210",
      password: bcrypt.hashSync("user123", 10),
      role: "user",
      wishlist: [],
      addresses: [
        {
          id: "addr-user-home",
          label: "Home",
          recipient: "John User",
          mobile: "9876543210",
          street: "12 Lake View Road",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600028",
          isDefault: true
        }
      ],
      defaultAddressId: "addr-user-home"
    }
  ],
  products: [...seedProducts, ...bulkProducts],
  flashSales: [...seedFlashSales],
  carts: [],
  orders: [],
  clicks: [],
  reviews: [
    {
      id: "r1",
      productId: "p1",
      userId: "u-user",
      rating: 5,
      comment: "Excellent noise cancellation and super comfortable for long listening sessions.",
      createdAt: new Date(now - oneHour * 8).toISOString(),
      updatedAt: new Date(now - oneHour * 8).toISOString()
    },
    {
      id: "r2",
      productId: "p3",
      userId: "u-user",
      rating: 4,
      comment: "Looks great and feels light. Cushioning is solid for everyday use.",
      createdAt: new Date(now - oneHour * 5).toISOString(),
      updatedAt: new Date(now - oneHour * 5).toISOString()
    }
  ],
  coupons: [
    {
      code: "SAVE10",
      description: "10% off orders above 2,500",
      type: "percentage",
      value: 10,
      minSubtotal: 2500,
      maxDiscount: 1500,
      isActive: true
    },
    {
      code: "FLASH500",
      description: "Flat 500 off flash-fashion baskets above 6,000",
      type: "flat",
      value: 500,
      minSubtotal: 6000,
      maxDiscount: 500,
      isActive: true
    },
    {
      code: "MEGA15",
      description: "15% off premium carts above 15,000",
      type: "percentage",
      value: 15,
      minSubtotal: 15000,
      maxDiscount: 3000,
      isActive: true
    }
  ],
  meta: {
    lastAutoFlashRefreshDate: ""
  }
};

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

function normalizeProductSizes(sizes) {
  if (Array.isArray(sizes)) {
    const cleaned = [...new Set(sizes.map((size) => String(size).trim().toUpperCase()).filter(Boolean))];
    return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_SIZES];
  }

  if (typeof sizes === "string") {
    const cleaned = [...new Set(
      sizes
        .split(",")
        .map((size) => String(size).trim().toUpperCase())
        .filter(Boolean)
    )];
    return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_SIZES];
  }

  return [...DEFAULT_PRODUCT_SIZES];
}

function normalizeProduct(product) {
  return {
    ...product,
    sizes: normalizeProductSizes(product?.sizes)
  };
}

function normalizeCoupon(coupon) {
  return {
    ...coupon,
    code: String(coupon.code || "").trim().toUpperCase()
  };
}

function normalizeUser(user) {
  const addresses = Array.isArray(user?.addresses)
    ? user.addresses.map((address) => ({
        id: address?.id || newId("addr"),
        label: String(address?.label || "Address").trim(),
        recipient: String(address?.recipient || user?.name || "").trim(),
        mobile: String(address?.mobile || "").trim(),
        street: String(address?.street || "").trim(),
        city: String(address?.city || "").trim(),
        state: String(address?.state || "").trim(),
        pincode: String(address?.pincode || "").trim(),
        isDefault: Boolean(address?.isDefault)
      }))
    : [];

  const defaultAddressId = user?.defaultAddressId || addresses.find((address) => address.isDefault)?.id || null;

  return {
    ...user,
    address: String(user?.address || "").trim(),
    phone: String(user?.phone || "").trim(),
    wishlist: Array.isArray(user?.wishlist) ? user.wishlist : [],
    addresses,
    defaultAddressId
  };
}

function mergeUsers(baseUsers, loadedUsers) {
  const normalizedBaseUsers = Array.isArray(baseUsers) ? baseUsers.map(normalizeUser) : [];
  const normalizedLoadedUsers = Array.isArray(loadedUsers) ? loadedUsers.map(normalizeUser) : [];
  const merged = [];
  const baseById = new Map(normalizedBaseUsers.map((user) => [user.id, user]));

  normalizedLoadedUsers.forEach((loadedUser) => {
    const baseUser = baseById.get(loadedUser.id);
    if (!baseUser) {
      merged.push(loadedUser);
      return;
    }

    const mergedUser = normalizeUser({
      ...baseUser,
      ...loadedUser,
      password: loadedUser.password || baseUser.password,
      address: loadedUser.address || baseUser.address,
      phone: loadedUser.phone || baseUser.phone,
      wishlist: Array.isArray(loadedUser.wishlist) ? loadedUser.wishlist : baseUser.wishlist,
      addresses: Array.isArray(loadedUser.addresses) && loadedUser.addresses.length ? loadedUser.addresses : baseUser.addresses,
      defaultAddressId: loadedUser.defaultAddressId || baseUser.defaultAddressId
    });

    if (!mergedUser.address && mergedUser.addresses.length) {
      const preferredAddress = mergedUser.addresses.find((address) => address.id === mergedUser.defaultAddressId) || mergedUser.addresses[0];
      mergedUser.address = [preferredAddress.street, preferredAddress.city, preferredAddress.state, preferredAddress.pincode]
        .filter(Boolean)
        .join(", ");
    }

    if (!mergedUser.phone && mergedUser.addresses.length) {
      const preferredAddress = mergedUser.addresses.find((address) => address.id === mergedUser.defaultAddressId) || mergedUser.addresses[0];
      mergedUser.phone = preferredAddress.mobile || "";
    }

    merged.push(mergedUser);
    baseById.delete(loadedUser.id);
  });

  return [...merged, ...baseById.values()];
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeReview(review) {
  const timestamp = review?.createdAt || new Date().toISOString();
  return {
    ...review,
    rating: Math.max(1, Math.min(5, Math.floor(Number(review?.rating) || 0) || 1)),
    comment: String(review?.comment || "").trim(),
    createdAt: timestamp,
    updatedAt: review?.updatedAt || timestamp
  };
}

function normalizeOrder(order) {
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => {
        const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
        const unitPrice = Number(item?.unitPrice || 0);
        return {
          ...item,
          quantity,
          image: item?.image || "",
          size: item?.size ? String(item.size).trim().toUpperCase() : undefined,
          unitPrice,
          lineTotal: Number(item?.lineTotal || unitPrice * quantity),
          usedFlashSale: Boolean(item?.usedFlashSale)
        };
      })
    : [];

  const subtotal = Number(order?.subtotal || items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));
  const discount = Number(order?.discount || 0);
  const total = Number(order?.total || Math.max(0, subtotal - discount));

  return {
    ...order,
    items,
    subtotal,
    discount,
    total,
    appliedCoupon: order?.appliedCoupon ? sanitizeCoupon(order.appliedCoupon) : null,
    deliveryAddress: String(order?.deliveryAddress || "").trim(),
    paymentMethod: String(order?.paymentMethod || "Cash on Delivery").trim(),
    status: String(order?.status || "confirmed").trim().toLowerCase(),
    statusHistory: Array.isArray(order?.statusHistory) ? order.statusHistory : [],
    cancellationRequestedAt: order?.cancellationRequestedAt || null,
    returnRequestedAt: order?.returnRequestedAt || null,
    returnReason: order?.returnReason ? String(order.returnReason).trim() : "",
    saveForLater: Boolean(order?.saveForLater)
  };
}

function normalizeFlashSale(sale, productsById) {
  const product = productsById.get(sale?.productId);
  if (!product) return null;

  const discountPrice = Number(sale?.discountPrice);
  const stockLimit = Math.floor(Number(sale?.stockLimit));
  const sold = Math.max(0, Math.floor(Number(sale?.sold) || 0));
  const startMs = new Date(sale?.startTime).getTime();
  const endMs = new Date(sale?.endTime).getTime();

  if (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= Number(product.price || 0)) {
    return null;
  }
  if (!Number.isFinite(stockLimit) || stockLimit <= 0) {
    return null;
  }
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }

  return {
    ...sale,
    discountPrice,
    stockLimit: Math.min(stockLimit, Number(product.stock || stockLimit)),
    sold: Math.min(sold, stockLimit),
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString()
  };
}

function normalizeLoadedState(snapshot) {
  const next = snapshot && typeof snapshot === "object" ? snapshot : {};
  const hasLoadedProducts = Array.isArray(next.products) && next.products.length > 0;
  Object.assign(state, {
    users: Array.isArray(next.users) && next.users.length ? mergeUsers(state.users, next.users) : state.users.map(normalizeUser),
    products: Array.isArray(next.products) && next.products.length
      ? dedupeById(next.products.map(normalizeProduct))
      : dedupeById(state.products.map(normalizeProduct)),
    flashSales: Array.isArray(next.flashSales) && next.flashSales.length ? next.flashSales : state.flashSales,
    carts: Array.isArray(next.carts)
      ? next.carts.map((cart) => ({
          ...cart,
          couponCode: cart?.couponCode ? String(cart.couponCode).trim().toUpperCase() : null,
          items: Array.isArray(cart?.items) ? cart.items : []
        }))
      : [],
    orders: Array.isArray(next.orders) ? next.orders.map(normalizeOrder) : [],
    clicks: Array.isArray(next.clicks) ? next.clicks : [],
    reviews: Array.isArray(next.reviews) ? next.reviews.map(normalizeReview).filter((review) => review.comment) : state.reviews,
    coupons: Array.isArray(next.coupons) && next.coupons.length
      ? next.coupons.map(normalizeCoupon)
      : state.coupons,
    meta: {
      lastAutoFlashRefreshDate: String(next?.meta?.lastAutoFlashRefreshDate || state.meta.lastAutoFlashRefreshDate || "")
    }
  });

  const allSeedProducts = [...seedProducts, ...bulkProducts];
  const seedById = new Map(allSeedProducts.map((product) => [product.id, normalizeProduct(product)]));

  state.products = state.products.map((product) => {
    if (!seedById.has(product.id)) return normalizeProduct(product);
    return {
      ...seedById.get(product.id),
      ...normalizeProduct(product)
    };
  });

  if (!hasLoadedProducts) {
    for (const seedProduct of allSeedProducts) {
      if (!state.products.some((product) => product.id === seedProduct.id)) {
        state.products.push(normalizeProduct(seedProduct));
      }
    }
  }

  state.products = dedupeById(state.products.map(normalizeProduct));
  const productsById = new Map(state.products.map((product) => [product.id, product]));
  state.flashSales = (Array.isArray(state.flashSales) ? state.flashSales : [])
    .map((sale) => normalizeFlashSale(sale, productsById))
    .filter(Boolean);

  const hasLiveOrUpcomingSale = state.flashSales.some((sale) => {
    const current = Date.now();
    const start = new Date(sale.startTime).getTime();
    const end = new Date(sale.endTime).getTime();
    return end >= current && start <= end;
  });

  if (!state.flashSales.length || !hasLiveOrUpcomingSale) {
    state.flashSales = seedFlashSales
      .map((sale) => normalizeFlashSale(sale, productsById))
      .filter(Boolean);
  }
}

function readFileSnapshot() {
  if (!persistToFile || !fs.existsSync(DB_PATH)) return null;

  try {
    const file = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(file);
  } catch (error) {
    console.error("Failed to load DB file:", error.message);
    return null;
  }
}

function getStateSnapshot() {
  return {
    users: state.users,
    products: state.products,
    flashSales: state.flashSales,
    carts: state.carts,
    orders: state.orders,
    clicks: state.clicks,
    reviews: state.reviews,
    coupons: state.coupons,
    meta: state.meta
  };
}

function saveFileSnapshot() {
  if (!persistToFile) return;

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(getStateSnapshot(), null, 2));
  } catch (error) {
    console.error("Failed to save DB file:", error.message);
  }
}

function saveDatabaseSnapshot() {
  if (!pool || !databaseReady) return;

  const payload = JSON.stringify(getStateSnapshot());
  pool
    .query(
      `INSERT INTO app_state (id, payload)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [payload]
    )
    .catch((error) => {
      console.error("Failed to save database snapshot:", error.message);
    });
}

async function saveUsersSnapshot() {
  if (!pool || !databaseReady) return;

  const rows = state.users.map((user) => [
    user.id,
    user.name,
    user.email,
    user.address || null,
    user.phone || null,
    user.password,
    user.role,
    JSON.stringify(user.wishlist || []),
    JSON.stringify(user.addresses || []),
    user.defaultAddressId || null
  ]);

  try {
    if (rows.length) {
      await pool.query(
        `INSERT INTO users (id, name, email, address, phone, password, role, wishlist_json, addresses_json, default_address_id)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           address = VALUES(address),
           phone = VALUES(phone),
           password = VALUES(password),
           role = VALUES(role),
           wishlist_json = VALUES(wishlist_json),
           addresses_json = VALUES(addresses_json),
           default_address_id = VALUES(default_address_id)`,
        [rows]
      );
    }
  } catch (error) {
    console.error("Failed to save users snapshot:", error.message);
  }
}

async function getPersistedUsers() {
  if (!pool || !databaseReady) {
    return state.users.map(sanitizeUser);
  }

  const [rows] = await pool.query(
    "SELECT id, name, email, address, phone, role, wishlist_json, addresses_json, default_address_id, updated_at FROM users ORDER BY updated_at DESC"
  );

  return rows.map((row) => {
    let wishlist = [];
    let addresses = [];

    if (row.wishlist_json) {
      try {
        wishlist = JSON.parse(row.wishlist_json);
      } catch (_error) {
        wishlist = [];
      }
    }

    if (row.addresses_json) {
      try {
        addresses = JSON.parse(row.addresses_json);
      } catch (_error) {
        addresses = [];
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      address: row.address || "",
      phone: row.phone || "",
      role: row.role,
      wishlist,
      addresses,
      defaultAddressId: row.default_address_id || null,
      updatedAt: row.updated_at
    };
  });
}

async function getPersistedUserRecords() {
  if (!pool || !databaseReady) {
    return [];
  }

  const [rows] = await pool.query(
    "SELECT id, name, email, address, phone, password, role, wishlist_json, addresses_json, default_address_id, updated_at FROM users ORDER BY updated_at DESC"
  );

  return rows.map((row) => {
    let wishlist = [];
    let addresses = [];

    if (row.wishlist_json) {
      try {
        wishlist = JSON.parse(row.wishlist_json);
      } catch (_error) {
        wishlist = [];
      }
    }

    if (row.addresses_json) {
      try {
        addresses = JSON.parse(row.addresses_json);
      } catch (_error) {
        addresses = [];
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      address: row.address || "",
      phone: row.phone || "",
      password: row.password,
      role: row.role,
      wishlist,
      addresses,
      defaultAddressId: row.default_address_id || null,
      updatedAt: row.updated_at
    };
  });
}

function saveToDisk() {
  saveFileSnapshot();
  void saveUsersSnapshot();
  saveDatabaseSnapshot();
}

async function ensureUserColumn(columnName, definition) {
  if (!pool) return;

  const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE ?", [columnName]);
  if (Array.isArray(rows) && rows.length) {
    return;
  }

  await pool.query(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
}

async function initializeStore() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let loadedSnapshot = null;
    const fileSnapshot = readFileSnapshot();

    if (mysql && useDatabase) {
      try {
        const adminConnection = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password
        });

        try {
          await adminConnection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          );
        } finally {
          await adminConnection.end().catch(() => {});
        }

        pool = mysql.createPool({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          waitForConnections: true,
          connectionLimit: 10
        });

        await pool.query("SELECT 1");

        await pool.query(`
          CREATE TABLE IF NOT EXISTS app_state (
            id INT PRIMARY KEY,
            payload LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            address TEXT,
            phone VARCHAR(32),
            password VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL,
            wishlist_json LONGTEXT NOT NULL,
            addresses_json LONGTEXT,
            default_address_id VARCHAR(64),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        await ensureUserColumn("phone", "VARCHAR(32) NULL AFTER address");
        await ensureUserColumn("addresses_json", "LONGTEXT NULL AFTER wishlist_json");
        await ensureUserColumn("default_address_id", "VARCHAR(64) NULL AFTER addresses_json");

        const [rows] = await pool.query("SELECT payload FROM app_state WHERE id = 1 LIMIT 1");
        if (Array.isArray(rows) && rows.length && rows[0].payload) {
          loadedSnapshot = JSON.parse(rows[0].payload);
        } else if (fileSnapshot) {
          loadedSnapshot = fileSnapshot;
        } else {
          loadedSnapshot = getStateSnapshot();
        }

        const persistedUsers = await getPersistedUserRecords();
        if (persistedUsers.length) {
          loadedSnapshot.users = mergeUsers(
            Array.isArray(loadedSnapshot.users) ? loadedSnapshot.users : state.users,
            persistedUsers
          );
        }

        normalizeLoadedState(loadedSnapshot);
        databaseReady = true;
        await saveDatabaseSnapshot();
        await saveUsersSnapshot();
        saveFileSnapshot();
        return state;
      } catch (error) {
        console.warn("MySQL store unavailable, falling back to file/in-memory storage:", error.message);
        pool = null;
        databaseReady = false;
      }
    }

    normalizeLoadedState(fileSnapshot || getStateSnapshot());

    return state;
  })();

  return initPromise;
}

function getActiveFlashSale(productId) {
  const current = Date.now();
  return state.flashSales.find((sale) => {
    if (sale.productId !== productId) return false;
    const isWindowOpen = current >= new Date(sale.startTime).getTime() && current <= new Date(sale.endTime).getTime();
    const hasStock = sale.sold < sale.stockLimit;
    return isWindowOpen && hasStock;
  });
}

function getReviewsForProduct(productId) {
  return state.reviews
    .filter((review) => review.productId === productId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

function getProductRatingSummary(productId) {
  const reviews = getReviewsForProduct(productId);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (!reviews.length) {
    return {
      average: 0,
      count: 0,
      distribution
    };
  }

  const total = reviews.reduce((sum, review) => {
    const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));
    distribution[rating] += 1;
    return sum + rating;
  }, 0);

  return {
    average: Number((total / reviews.length).toFixed(1)),
    count: reviews.length,
    distribution
  };
}

function getFlashSaleStatus(sale, current = Date.now()) {
  const start = new Date(sale.startTime).getTime();
  const end = new Date(sale.endTime).getTime();
  const remaining = Math.max(0, sale.stockLimit - sale.sold);
  const isScheduled = current < start;
  const isExpiredByTime = current > end;
  const isSoldOut = remaining <= 0;
  const isActive = !isScheduled && !isExpiredByTime && !isSoldOut;
  const msUntilStart = Math.max(0, start - current);
  const msUntilEnd = Math.max(0, end - current);

  return {
    remaining,
    isScheduled,
    isExpiredByTime,
    isSoldOut,
    isActive,
    msUntilStart,
    msUntilEnd
  };
}

function getStartOfNextDay(current = Date.now()) {
  const next = new Date(current);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function buildAutoFlashSaleWindows(current = Date.now()) {
  const nextDayStart = getStartOfNextDay(current);
  const baseWindows = [
    { startOffsetMs: -30 * 60 * 1000, durationMs: 6 * 60 * 60 * 1000 },
    { startOffsetMs: 2 * 60 * 60 * 1000, durationMs: 6 * 60 * 60 * 1000 },
    { startOffsetMs: 6 * 60 * 60 * 1000, durationMs: 8 * 60 * 60 * 1000 }
  ];

  return baseWindows.slice(0, DAILY_AUTO_FLASH_SALE_COUNT).map((window) => {
    const start = current + window.startOffsetMs;
    const end = Math.min(nextDayStart, start + window.durationMs);
    return {
      startTime: new Date(start).toISOString(),
      endTime: new Date(Math.max(start + 60 * 60 * 1000, end)).toISOString()
    };
  });
}

function hasFlashSaleOverlap(productId, startTime, endTime, ignoredSaleIds = new Set()) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  return state.flashSales.some((sale) => {
    if (sale.productId !== productId || ignoredSaleIds.has(sale.id)) return false;
    const existingStart = new Date(sale.startTime).getTime();
    const existingEnd = new Date(sale.endTime).getTime();
    return start < existingEnd && end > existingStart;
  });
}

function buildDailyAutoFlashSales(current = Date.now()) {
  const dateKey = getDateKey(new Date(current));
  const windows = buildAutoFlashSaleWindows(current);
  const products = [...state.products]
    .filter((product) => Number(product.stock || 0) >= 8 && Number(product.price || 0) > 1000)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!products.length) {
    return { dateKey, sales: [] };
  }

  const daySeed = Math.floor(current / (24 * 60 * 60 * 1000));
  const startIndex = daySeed % products.length;
  const rotatedProducts = [...products.slice(startIndex), ...products.slice(0, startIndex)];
  const pickedSales = [];
  const usedProductIds = new Set();
  const ignoredSaleIds = new Set(state.flashSales.filter((sale) => sale.autoGenerated).map((sale) => sale.id));

  for (const window of windows) {
    const product = rotatedProducts.find((candidate) => {
      if (usedProductIds.has(candidate.id)) return false;
      return !hasFlashSaleOverlap(candidate.id, window.startTime, window.endTime, ignoredSaleIds);
    });

    if (!product) continue;

    const discountRate = 0.16 + (usedProductIds.size * 0.04);
    const rawDiscountPrice = Math.round(Number(product.price) * (1 - discountRate));
    const discountPrice = Math.max(1, Math.min(Number(product.price) - 1, rawDiscountPrice));
    const stockLimit = Math.max(4, Math.min(Number(product.stock || 0), Math.ceil(Number(product.stock || 0) * 0.35)));

    pickedSales.push({
      id: `auto-fs-${dateKey}-${product.id}`,
      productId: product.id,
      discountPrice,
      startTime: window.startTime,
      endTime: window.endTime,
      stockLimit,
      sold: 0,
      autoGenerated: true,
      autoGeneratedForDate: dateKey
    });

    usedProductIds.add(product.id);
  }

  return { dateKey, sales: pickedSales };
}

function refreshDailyAutoFlashSales(current = Date.now(), options = {}) {
  const { force = false } = options;
  const currentDateKey = getDateKey(new Date(current));
  const existingAutoSales = state.flashSales.filter((sale) => sale.autoGenerated);
  const hasFreshAutoSales = existingAutoSales.some((sale) => sale.autoGeneratedForDate === currentDateKey);

  if (!force && state.meta.lastAutoFlashRefreshDate === currentDateKey && hasFreshAutoSales) {
    return { updated: false, createdSales: [] };
  }

  const manualSales = state.flashSales.filter((sale) => !sale.autoGenerated);
  const { dateKey, sales } = buildDailyAutoFlashSales(current);
  state.flashSales = [...manualSales, ...sales];
  state.meta.lastAutoFlashRefreshDate = dateKey;

  return { updated: true, createdSales: sales };
}

function getCanonicalCategory(product) {
  const category = product?.category || "";
  const nameAndDescription = `${product?.name || ""} ${product?.description || ""}`.toLowerCase();

  if (category === "Clothing") {
    return "Fashion";
  }

  if (category === "Home Appliances") {
    return "Home";
  }

  // Treat phone-like electronics as a dedicated Mobiles category for filtering and breadcrumbs.
  if (category === "Electronics" && /(smartphone|cell phone|mobile phone)/i.test(nameAndDescription)) {
    return "Mobiles";
  }

  return category;
}

function enrichProduct(product) {
  const category = getCanonicalCategory(product);
  const sale = getActiveFlashSale(product.id);
  const saleLeft = sale ? Math.max(0, sale.stockLimit - sale.sold) : 0;
  const referenceImages = Array.isArray(product.referenceImages) && product.referenceImages.length
    ? product.referenceImages
    : [product.image];

  return {
    ...product,
    category,
    referenceImages,
    ratingSummary: getProductRatingSummary(product.id),
    reviewCount: getReviewsForProduct(product.id).length,
    flashSale: sale
      ? {
          ...sale,
          remaining: saleLeft
        }
      : null
  };
}

function getProductById(productId) {
  return state.products.find((p) => p.id === productId);
}

function getCartByUserId(userId) {
  let cart = state.carts.find((entry) => entry.userId === userId);
  if (!cart) {
    cart = { userId, items: [], couponCode: null };
    state.carts.push(cart);
  }
  if (!Object.prototype.hasOwnProperty.call(cart, "couponCode")) {
    cart.couponCode = null;
  }
  return cart;
}

function getCouponByCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;
  return state.coupons.find((coupon) => coupon.code === normalized && coupon.isActive) || null;
}

function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon || !coupon.isActive) return 0;
  const normalizedSubtotal = Number(subtotal) || 0;
  if (normalizedSubtotal <= 0 || normalizedSubtotal < Number(coupon.minSubtotal || 0)) {
    return 0;
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.round((normalizedSubtotal * Number(coupon.value || 0)) / 100);
  } else {
    discount = Number(coupon.value || 0);
  }

  if (Number.isFinite(coupon.maxDiscount) && coupon.maxDiscount > 0) {
    discount = Math.min(discount, Number(coupon.maxDiscount));
  }

  return Math.max(0, Math.min(normalizedSubtotal, Math.round(discount)));
}

function sanitizeCoupon(coupon) {
  if (!coupon) return null;
  return {
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minSubtotal: coupon.minSubtotal,
    maxDiscount: coupon.maxDiscount
  };
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function getStoreHealth() {
  return {
    persistence: {
      file: persistToFile,
      databaseConfigured: useDatabase,
      databaseReady
    },
    counts: {
      users: state.users.length,
      products: state.products.length,
      flashSales: state.flashSales.length,
      carts: state.carts.length,
      orders: state.orders.length,
      reviews: state.reviews.length,
      coupons: state.coupons.length
    }
  };
}

function newId(prefix) {
  return `${prefix}-${uuidv4()}`;
}

const ready = initializeStore;

module.exports = {
  state,
  saveToDisk,
  initializeStore,
  ready,
  getActiveFlashSale,
  getFlashSaleStatus,
  getCanonicalCategory,
  enrichProduct,
  getProductById,
  getCartByUserId,
  getReviewsForProduct,
  getProductRatingSummary,
  getCouponByCode,
  calculateCouponDiscount,
  sanitizeCoupon,
  sanitizeUser,
  getStoreHealth,
  getPersistedUsers,
  normalizeProductSizes,
  DEFAULT_PRODUCT_SIZES,
  newId,
  refreshDailyAutoFlashSales
};
