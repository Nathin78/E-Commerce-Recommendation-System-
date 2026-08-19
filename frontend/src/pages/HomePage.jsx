import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import ProductCard from "../components/ProductCard";
import api from "../services/api";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { inr } from "../utils/currency";
import { useTheme } from "@mui/material/styles";
import WhatshotOutlinedIcon from "@mui/icons-material/WhatshotOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import LocalMallOutlinedIcon from "@mui/icons-material/LocalMallOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ColorIconBadge from "../components/ColorIconBadge";

const topBanners = [
  {
    title: "Premium Watch Drop",
    sub: "Luxury styles with live stock updates",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1400",
    category: "Fashion",
    productId: "p3"
  },
  {
    title: "Laptop Deals",
    sub: "Fast work machines for home and office",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1400",
    category: "Electronics",
    productId: "p2"
  },
  {
    title: "Home Essentials",
    sub: "Useful upgrades for everyday living",
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1200",
    category: "Home Appliances",
    productId: "p8"
  }
];

function formatLiveMessage(type, payload = {}) {
  const time = new Date().toLocaleTimeString();

  switch (type) {
    case "purchase":
      return `${payload.userName || "A shopper"} bought items worth ${inr(payload.total || 0)} at ${time}`;
    case "stock":
      return `${payload.productId} stock updated to ${payload.stock ?? 0} at ${time}`;
    case "low-stock":
      return `${payload.productId} is running low with only ${payload.left ?? 0} left at ${time}`;
    case "sale-started":
      return `Flash sale ${payload.saleId} started at ${time}`;
    case "sale-expired":
      return `Flash sale ${payload.saleId} expired at ${time}`;
    default:
      return `${type} at ${time}`;
  }
}

function sortByOfferPriority(a, b) {
  const aOnSale = Boolean(a.flashSale);
  const bOnSale = Boolean(b.flashSale);

  if (aOnSale !== bOnSale) {
    return aOnSale ? -1 : 1;
  }

  if (aOnSale && bOnSale) {
    const aDiscount = a.price > 0 ? ((a.price - a.flashSale.discountPrice) / a.price) * 100 : 0;
    const bDiscount = b.price > 0 ? ((b.price - b.flashSale.discountPrice) / b.price) * 100 : 0;
    if (aDiscount !== bDiscount) {
      return bDiscount - aDiscount;
    }
  }

  if (b.views !== a.views) {
    return b.views - a.views;
  }

  return a.name.localeCompare(b.name);
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

export default function HomePage({ serverNow }) {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activity, setActivity] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = params.get("q")?.toLowerCase().trim() || "";
  const selectedCategory = params.get("category") || "";
  const [filters, setFilters] = useState({
    brand: "",
    size: "",
    minRating: "",
    stock: "all",
    minPrice: "",
    maxPrice: "",
    sortBy: "featured"
  });

  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const sizes = useMemo(
    () => [...new Set(products.flatMap((product) => product.sizes || []).filter(Boolean))],
    [products]
  );

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = selectedCategory ? product.category === selectedCategory : true;
      const byQuery = query
        ? `${product.name} ${product.brand || ""} ${product.category}`.toLowerCase().includes(query)
        : true;
      const byBrand = filters.brand ? product.brand === filters.brand : true;
      const bySize = filters.size ? (product.sizes || []).includes(filters.size) : true;
      const byRating = filters.minRating ? Number(product.ratingSummary?.average || 0) >= Number(filters.minRating) : true;
      const finalPrice = product.flashSale ? product.flashSale.discountPrice : product.price;
      const byMinPrice = filters.minPrice ? finalPrice >= Number(filters.minPrice) : true;
      const byMaxPrice = filters.maxPrice ? finalPrice <= Number(filters.maxPrice) : true;
      const availableStock = product.flashSale?.remaining ?? product.stock ?? 0;
      const byStock =
        filters.stock === "in_stock" ? availableStock > 0
          : filters.stock === "flash_sale" ? Boolean(product.flashSale)
            : true;
      return byCategory && byQuery && byBrand && bySize && byRating && byMinPrice && byMaxPrice && byStock;
    }).sort((a, b) => {
      const aPrice = a.flashSale ? a.flashSale.discountPrice : a.price;
      const bPrice = b.flashSale ? b.flashSale.discountPrice : b.price;
      const aDiscount = a.price > 0 && a.flashSale ? ((a.price - a.flashSale.discountPrice) / a.price) * 100 : 0;
      const bDiscount = b.price > 0 && b.flashSale ? ((b.price - b.flashSale.discountPrice) / b.price) * 100 : 0;

      switch (filters.sortBy) {
        case "price_asc":
          return aPrice - bPrice;
        case "price_desc":
          return bPrice - aPrice;
        case "popularity":
          return Number(b.views || 0) - Number(a.views || 0);
        case "discount":
          return bDiscount - aDiscount;
        case "rating":
          return Number(b.ratingSummary?.average || 0) - Number(a.ratingSummary?.average || 0);
        default:
          return sortByOfferPriority(a, b);
      }
    });
  }, [products, selectedCategory, query, filters]);

  const flashProducts = useMemo(
    () => [...products.filter((p) => p.flashSale)].sort(sortByOfferPriority).slice(0, 12),
    [products]
  );
  const flashProductIds = useMemo(() => new Set(flashProducts.map((product) => product.id)), [flashProducts]);
  const trendingProducts = useMemo(
    () => [...visibleProducts.filter((product) => !flashProductIds.has(product.id))].sort(sortByOfferPriority).slice(0, 20),
    [visibleProducts, flashProductIds]
  );
  const displayedProductIds = useMemo(() => {
    const ids = new Set();
    flashProducts.forEach((product) => ids.add(product.id));
    trendingProducts.forEach((product) => ids.add(product.id));
    return ids;
  }, [flashProducts, trendingProducts]);
  const visibleRecommendations = useMemo(
    () => recommendations.filter((product) => !displayedProductIds.has(product.id)),
    [recommendations, displayedProductIds]
  );
  const activeFilterCount =
    Number(Boolean(selectedCategory)) +
    Number(Boolean(query)) +
    Number(Boolean(filters.brand)) +
    Number(Boolean(filters.size)) +
    Number(Boolean(filters.minRating)) +
    Number(Boolean(filters.minPrice)) +
    Number(Boolean(filters.maxPrice)) +
    Number(filters.stock !== "all") +
    Number(filters.sortBy !== "featured");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products");
      setProducts(dedupeById(data.products || []));
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendations([]);
      return;
    }

    let cancelled = false;

    api
      .get("/products/recommendations")
      .then(({ data }) => {
        if (!cancelled) {
          setRecommendations(data.recommendations || []);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRecommendations([]);
        if (error.response?.status === 401) {
          logout();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    const pushLiveEvent = (type, payload = {}) => {
      setLiveEvents((prev) => [
        { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message: formatLiveMessage(type, payload) },
        ...prev
      ].slice(0, 6));
    };

    const onCatalogSnapshot = (snapshot) => {
      if (Array.isArray(snapshot?.products)) {
        setProducts(dedupeById(snapshot.products));
      }
    };

    const onStockUpdate = ({ productId, stock, flashSaleRemaining }) => {
      pushLiveEvent("stock", { productId, stock });
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            stock,
            flashSale: p.flashSale
              ? {
                  ...p.flashSale,
                  remaining: flashSaleRemaining ?? p.flashSale.remaining
                }
              : p.flashSale
          };
        })
      );
    };

    const onStockLow = ({ productId, left }) => pushLiveEvent("low-stock", { productId, left });
    const onPurchase = ({ userName, total, createdAt }) => {
      pushLiveEvent("purchase", { userName, total, createdAt });
      setMessage(`New purchase completed: ${inr(total)}`);
      setActivity((prev) => [
        `${userName || "A shopper"} purchased items worth ${inr(total)} at ${new Date(createdAt).toLocaleTimeString()}`,
        ...prev
      ].slice(0, 6));
    };

    const onProductCreated = (product) => setProducts((prev) => dedupeById([product, ...prev]));
    const onProductUpdated = (product) => setProducts((prev) => dedupeById(prev.map((item) => (item.id === product.id ? product : item))));
    const onProductDeleted = ({ id }) => setProducts((prev) => prev.filter((item) => item.id !== id));

    const onFlashCreated = () => loadProducts();
    const onFlashStarted = ({ saleId }) => {
      pushLiveEvent("sale-started", { saleId });
      loadProducts();
    };
    const onFlashExpired = ({ saleId }) => {
      pushLiveEvent("sale-expired", { saleId });
      loadProducts();
    };
    const onFlashTick = (ticks) => {
      setProducts((prev) =>
        dedupeById(prev).map((product) => {
          const tick = ticks.find((entry) => entry.productId === product.id);
          if (!tick || !product.flashSale) return product;
          if (!tick.isActive) return { ...product, flashSale: null };
          return {
            ...product,
            flashSale: {
              ...product.flashSale,
              remaining: tick.remaining
            }
          };
        })
      );
    };

    socket.on("stock:update", onStockUpdate);
    socket.on("stock:low", onStockLow);
    socket.on("purchase:new", onPurchase);
    socket.on("catalog:snapshot", onCatalogSnapshot);
    socket.on("product:created", onProductCreated);
    socket.on("product:updated", onProductUpdated);
    socket.on("product:deleted", onProductDeleted);
    socket.on("flashSale:created", onFlashCreated);
    socket.on("flashSale:started", onFlashStarted);
    socket.on("flashSale:expired", onFlashExpired);
    socket.on("flashSale:tick", onFlashTick);

    return () => {
      socket.off("stock:update", onStockUpdate);
      socket.off("stock:low", onStockLow);
      socket.off("purchase:new", onPurchase);
      socket.off("catalog:snapshot", onCatalogSnapshot);
      socket.off("product:created", onProductCreated);
      socket.off("product:updated", onProductUpdated);
      socket.off("product:deleted", onProductDeleted);
      socket.off("flashSale:created", onFlashCreated);
      socket.off("flashSale:started", onFlashStarted);
      socket.off("flashSale:expired", onFlashExpired);
      socket.off("flashSale:tick", onFlashTick);
    };
  }, [isAuthenticated]);

  const addToCart = async (productId, size = "M") => {
    if (!isAuthenticated) return setMessage("Please login to add to cart");
    try {
      await api.post("/cart", { productId, quantity: 1, action: "add", size });
      setMessage("Added to cart");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to add cart");
    }
  };

  const addToWishlist = async (productId) => {
    if (!isAuthenticated) return setMessage("Please login to use wishlist");
    try {
      await api.post("/users/wishlist", { productId });
      setMessage("Saved to wishlist");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save wishlist");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.6, md: 2.2 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Grid container spacing={1.5} sx={{ mb: 2.2 }}>
        {topBanners.map((banner, index) => (
          <Grid key={banner.title} size={{ xs: 12, md: index === 0 ? 5 : index === 1 ? 4 : 3 }}>
            <Paper
              onClick={() => navigate(`/products/${banner.productId}`)}
              sx={{
                minHeight: { xs: 150, sm: 180, md: 200 },
                p: 2,
                borderRadius: 2,
                color: theme.palette.text.primary,
                backgroundImage: `linear-gradient(120deg, ${theme.palette.mode === "dark" ? "rgba(2,6,23,0.78)" : "rgba(15,23,42,0.65)"}, ${theme.palette.mode === "dark" ? "rgba(37,99,235,0.38)" : "rgba(2,132,199,0.45)"}), url(${banner.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: "pointer"
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 24, sm: 28 }, lineHeight: 1.1 }}>{banner.title}</Typography>
              <Typography sx={{ mt: 1.2, fontWeight: 500, fontSize: { xs: 14, sm: 16 } }}>{banner.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 1.8, borderRadius: 2, mb: 2.2, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Brand"
            value={filters.brand}
            onChange={(event) => setFilters((prev) => ({ ...prev, brand: event.target.value }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Brands</MenuItem>
            {brands.map((brand) => (
              <MenuItem key={brand} value={brand}>{brand}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Size"
            value={filters.size}
            onChange={(event) => setFilters((prev) => ({ ...prev, size: event.target.value }))}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All Sizes</MenuItem>
            {sizes.map((size) => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Min Rating"
            value={filters.minRating}
            onChange={(event) => setFilters((prev) => ({ ...prev, minRating: event.target.value }))}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">Any Rating</MenuItem>
            {[4, 3, 2].map((rating) => (
              <MenuItem key={rating} value={rating}>{rating}+ stars</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Stock"
            value={filters.stock}
            onChange={(event) => setFilters((prev) => ({ ...prev, stock: event.target.value }))}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Items</MenuItem>
            <MenuItem value="in_stock">In Stock</MenuItem>
            <MenuItem value="flash_sale">Flash Sale</MenuItem>
          </TextField>
          <TextField
            label="Min Price"
            type="number"
            value={filters.minPrice}
            onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
            sx={{ minWidth: 130 }}
          />
          <TextField
            label="Max Price"
            type="number"
            value={filters.maxPrice}
            onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
            sx={{ minWidth: 130 }}
          />
          <TextField
            select
            label="Sort By"
            value={filters.sortBy}
            onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value }))}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="featured">Featured</MenuItem>
            <MenuItem value="price_asc">Price: Low to High</MenuItem>
            <MenuItem value="price_desc">Price: High to Low</MenuItem>
            <MenuItem value="popularity">Popularity</MenuItem>
            <MenuItem value="discount">Biggest Discount</MenuItem>
            <MenuItem value="rating">Highest Rated</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            onClick={() => setFilters({
              brand: "",
              size: "",
              minRating: "",
              stock: "all",
              minPrice: "",
              maxPrice: "",
              sortBy: "featured"
            })}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.6, borderRadius: 2, mb: 2.2, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Browse Summary
            </Typography>
            <Typography color="text.secondary">
              Showing {visibleProducts.length} matching product{visibleProducts.length === 1 ? "" : "s"}
              {selectedCategory ? ` in ${selectedCategory}` : ""}
              {query ? ` for "${query}"` : ""}.
            </Typography>
          </Box>
          {activeFilterCount ? (
            <Button
              variant="outlined"
              onClick={() => {
                setFilters({
                  brand: "",
                  size: "",
                  minRating: "",
                  stock: "all",
                  minPrice: "",
                  maxPrice: "",
                  sortBy: "featured"
                });
                navigate("/shop");
              }}
            >
              Clear Filters
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.8, borderRadius: 2, mb: 2.2, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1.3 }}>
          <ColorIconBadge icon={<InsightsOutlinedIcon />} palette={["#0ea5e9", "#2563eb"]} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Live Store Feed</Typography>
        </Stack>
        {!liveEvents.length ? (
          <Typography color="text.secondary">Waiting for live stock and order updates...</Typography>
        ) : (
          <Stack spacing={1}>
            {liveEvents.map((item) => (
              <Box key={item.id} sx={{ p: 1.2, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                <Typography variant="body2">{item.message}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 1.8, borderRadius: 2, mb: 2.2, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1.3 }}>
          <ColorIconBadge icon={<WhatshotOutlinedIcon />} palette={["#ef4444", "#f59e0b"]} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Today's Hot Pick</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {flashProducts.length ? flashProducts.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <ProductCard product={product} onAdd={addToCart} onWishlist={addToWishlist} serverNow={serverNow} />
            </Grid>
          )) : (
            <Grid size={12}><Alert severity="info">No flash products available right now.</Alert></Grid>
          )}
        </Grid>
      </Paper>

      <Paper
        sx={{
          p: 1.8,
          borderRadius: 2,
          mb: 2.2,
          bgcolor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#eaf4ff",
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1.3 }}>
          <ColorIconBadge icon={<LocalMallOutlinedIcon />} palette={["#8b5cf6", "#ec4899"]} size={42} />
          <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: 26, sm: 30 } }}>
            Shop for a Cool Summer {selectedCategory ? `• ${selectedCategory}` : ""}
          </Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {trendingProducts.length ? trendingProducts.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <ProductCard product={product} onAdd={addToCart} onWishlist={addToWishlist} serverNow={serverNow} />
            </Grid>
          )) : (
            <Grid size={12}><Alert severity="info">No products match this filter.</Alert></Grid>
          )}
        </Grid>
      </Paper>

      {isAuthenticated && visibleRecommendations.length ? (
        <Paper sx={{ p: 1.8, borderRadius: 2, mb: 2.2, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1.3 }}>
            <ColorIconBadge icon={<AutoAwesomeOutlinedIcon />} palette={["#7c3aed", "#06b6d4"]} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Recommended For You</Typography>
          </Stack>
          <Grid container spacing={1.5}>
            {visibleRecommendations.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <ProductCard product={product} onAdd={addToCart} onWishlist={addToWishlist} serverNow={serverNow} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1 }}>
          <ColorIconBadge icon={<BoltOutlinedIcon />} palette={["#10b981", "#14b8a6"]} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Live Activity</Typography>
        </Stack>
        {!activity.length ? (
          <Typography color="text.secondary">Waiting for live purchases...</Typography>
        ) : (
          <Stack spacing={0.8}>
            {activity.map((item, index) => (
              <Typography key={`${item}-${index}`} variant="body2">{item}</Typography>
            ))}
          </Stack>
        )}
      </Paper>

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage("")}>
        <Alert severity="info">{message}</Alert>
      </Snackbar>
    </Container>
  );
}

