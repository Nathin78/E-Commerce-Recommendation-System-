import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Stack,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import FlashCountdown from "../components/FlashCountdown";
import ProductImage from "../components/ProductImage";
import api from "../services/api";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { inr } from "../utils/currency";
import { useTheme } from "@mui/material/styles";
import { getProductImageSrc } from "../utils/productImage";

const DEFAULT_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"];

export default function ProductPage({ serverNow }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZE_OPTIONS[0]);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { isAuthenticated, user } = useAuth();

  const referenceImages = useMemo(
    () => (product?.referenceImages?.length ? product.referenceImages : product ? [getProductImageSrc(product.image)] : []),
    [product]
  );
  const sizeOptions = useMemo(
    () => (product?.sizes?.length ? product.sizes : DEFAULT_SIZE_OPTIONS),
    [product]
  );

  const marketPrice = useMemo(() => {
    if (!product) return 0;
    return Math.round((product.price || 0) * 1.35);
  }, [product]);

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    return product.flashSale ? product.flashSale.discountPrice : product.price;
  }, [product]);

  const discountPercent = useMemo(() => {
    if (!marketPrice || !finalPrice) return 0;
    return Math.max(0, Math.round(((marketPrice - finalPrice) / marketPrice) * 100));
  }, [marketPrice, finalPrice]);

  const maxAvailable = useMemo(() => {
    if (!product) return 0;
    const flashLimit = product.flashSale?.remaining ?? product.stock;
    return Math.max(0, Math.min(product.stock || 0, flashLimit || 0));
  }, [product]);

  const quantityTotal = useMemo(() => finalPrice * quantity, [finalPrice, quantity]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data.product);
        setReviews(data.reviews || []);
        setCanReview(Boolean(data.canReview));
        setSelectedImage(getProductImageSrc(data.product.image));
        setSelectedSize(data.product.sizes?.[0] || DEFAULT_SIZE_OPTIONS[0]);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!maxAvailable) {
      setQuantity(1);
      return;
    }
    setQuantity((current) => Math.min(Math.max(1, current), maxAvailable));
  }, [maxAvailable]);

  useEffect(() => {
    if (!sizeOptions.length) return;
    setSelectedSize((current) => (sizeOptions.includes(current) ? current : sizeOptions[0]));
  }, [sizeOptions]);

  useEffect(() => {
    const onStockUpdate = ({ productId, stock, flashSaleRemaining }) => {
      setProduct((prev) => {
        if (!prev || prev.id !== productId) return prev;
        return {
          ...prev,
          stock,
          flashSale: prev.flashSale
            ? {
                ...prev.flashSale,
                remaining: flashSaleRemaining ?? prev.flashSale.remaining
              }
            : prev.flashSale
        };
      });
    };

    const onProductUpdated = (nextProduct) => {
      setProduct((prev) => (prev && prev.id === nextProduct.id ? nextProduct : prev));
      setSelectedImage((prev) => prev || getProductImageSrc(nextProduct.image));
    };

    const onFlashTick = (ticks) => {
      setProduct((prev) => {
        if (!prev?.flashSale) return prev;
        const tick = ticks.find((entry) => entry.productId === prev.id);
        if (!tick) return prev;
        if (!tick.isActive) {
          return { ...prev, flashSale: null };
        }
        return {
          ...prev,
          flashSale: {
            ...prev.flashSale,
            remaining: tick.remaining
          }
        };
      });
    };

    const refreshProduct = () => {
      api
        .get(`/products/${id}?trackView=false`)
        .then(({ data }) => {
          setProduct(data.product);
          setReviews(data.reviews || []);
          setCanReview(Boolean(data.canReview));
          setSelectedImage((current) => current || getProductImageSrc(data.product.image));
        })
        .catch((error) => {
          setMessage(error.response?.data?.message || "Failed to refresh product");
        });
    };

    socket.on("stock:update", onStockUpdate);
    socket.on("product:updated", onProductUpdated);
    socket.on("flashSale:created", refreshProduct);
    socket.on("flashSale:started", refreshProduct);
    socket.on("flashSale:expired", refreshProduct);
    socket.on("flashSale:tick", onFlashTick);

    return () => {
      socket.off("stock:update", onStockUpdate);
      socket.off("product:updated", onProductUpdated);
      socket.off("flashSale:created", refreshProduct);
      socket.off("flashSale:started", refreshProduct);
      socket.off("flashSale:expired", refreshProduct);
      socket.off("flashSale:tick", onFlashTick);
    };
  }, []);

  const addToCart = async () => {
    if (!isAuthenticated) return setMessage("Please login to add to cart");
    try {
      await api.post("/cart", { productId: product.id, quantity, action: "add", size: selectedSize });
      setMessage("Added to cart");
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot add to cart");
    }
  };

  const buyNow = async () => {
    if (!isAuthenticated) return setMessage("Please login to place an order");
    try {
      await api.post("/orders/buy-now", { productId: product.id, quantity, size: selectedSize });
      setMessage("Order placed successfully");
      navigate("/orders", { state: { message: "Order placed successfully" } });
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          await api.post("/cart", { productId: product.id, quantity, action: "add", size: selectedSize });
          await api.post("/orders");
          setMessage("Order placed successfully");
          navigate("/orders", { state: { message: "Order placed successfully" } });
          return;
        } catch (fallbackError) {
          setMessage(fallbackError.response?.data?.message || "Purchase failed");
          return;
        }
      }

      setMessage(error.response?.data?.message || "Purchase failed");
    }
  };

  const submitReview = async () => {
    if (!isAuthenticated) {
      setMessage("Please login to write a review");
      return;
    }

    setReviewSubmitting(true);
    try {
      const { data } = await api.post(`/products/${product.id}/reviews`, reviewForm);
      setProduct(data.product);
      setReviews(data.reviews || []);
      setReviewForm((prev) => ({ ...prev, comment: "" }));
      setCanReview(true);
      setMessage("Review saved successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">Product unavailable</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.6, md: 2.2 } }}>
      <Typography sx={{ color: "text.secondary", mb: 1.2, fontSize: { xs: 12, md: 14 } }}>
        Home / {product.category} / {product.brand || "Brand"} / {product.name}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Grid container spacing={1.2}>
            {referenceImages.slice(0, 4).map((img, index) => (
              <Grid item xs={6} key={`${img}-${index}`}>
                <Paper
                  onClick={() => setSelectedImage(img)}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    border: selectedImage === img ? `2px solid ${theme.palette.text.primary}` : `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    position: "relative",
                    cursor: "pointer"
                  }}
                >
                  {index === 0 ? (
                    <Chip label="GLOBAL BRANDS" color="primary" size="small" sx={{ position: "absolute", left: 10, top: 10 }} />
                  ) : null}
                  {index === 1 ? (
                    <Stack spacing={0.8} sx={{ position: "absolute", right: 10, top: 10 }}>
                      <Paper sx={{ p: 0.4, borderRadius: 2 }}><FavoriteBorderOutlinedIcon fontSize="small" /></Paper>
                      <Paper sx={{ p: 0.4, borderRadius: 2 }}><SendOutlinedIcon fontSize="small" /></Paper>
                    </Stack>
                  ) : null}
                  <ProductImage src={img} alt={`${product.name} ${index + 1}`} sx={{ width: "100%", height: { xs: 170, sm: 220, md: 260 }, objectFit: "contain" }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{product.brand || "Brand"}</Typography>
            <Typography sx={{ fontWeight: 600 }}>A healthy sweet treat</Typography>
            <Typography sx={{ color: "text.secondary" }}>Up to 30% Off</Typography>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 22 } }}>{product.name}</Typography>
          <Typography sx={{ color: "text.secondary", mb: 1 }}>{product.description}</Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Chip
              label={`${product.ratingSummary?.average || "0.0"} ★`}
              size="small"
              sx={{
                bgcolor: theme.palette.text.primary,
                color: theme.palette.background.default
              }}
            />
            <Typography sx={{ color: "text.secondary" }}>
              {product.ratingSummary?.count || 0} review{product.ratingSummary?.count === 1 ? "" : "s"}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 1 }}>
            <Typography sx={{ color: theme.palette.text.primary, fontWeight: 900, fontSize: { xs: 28, md: 34 } }}>{discountPercent}%</Typography>
            <Typography sx={{ textDecoration: "line-through", color: "text.secondary", fontSize: { xs: 20, md: 30 } }}>{inr(marketPrice)}</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 30, md: 40 } }}>{inr(finalPrice)}</Typography>
          </Stack>

          {product.flashSale ? <FlashCountdown sale={product.flashSale} serverNow={serverNow} /> : null}

          <Typography sx={{ mt: 2, fontWeight: 700 }}>Selected Color: GREY MATTER</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.1, flexWrap: "wrap" }}>
            {referenceImages.slice(0, 4).map((img, index) => (
              <Paper
                key={`color-${index}`}
                onClick={() => setSelectedImage(img)}
                sx={{
                  border: selectedImage === img ? `2px solid ${theme.palette.text.primary}` : `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 0.4,
                  cursor: "pointer"
                }}
              >
                <ProductImage src={img} alt={`Color ${index + 1}`} sx={{ width: { xs: 58, sm: 72 }, height: { xs: 42, sm: 52 }, objectFit: "cover", borderRadius: 1 }} />
              </Paper>
            ))}
          </Stack>

          <Typography sx={{ mt: 2, fontWeight: 700 }}>Select Size</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.1, flexWrap: "wrap" }}>
            {sizeOptions.map((size) => (
              <Button
                key={size}
                onClick={() => setSelectedSize(size)}
                variant={selectedSize === size ? "contained" : "outlined"}
                sx={{ minWidth: 62, borderRadius: 2 }}
              >
                {size}
              </Button>
            ))}
          </Stack>

          <Paper sx={{ mt: 2, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
            <Typography sx={{ fontWeight: 800 }}>Apply offers for maximum savings</Typography>
            <Typography sx={{ mt: 0.5 }}>Lowest price for you: {inr(finalPrice - Math.round(finalPrice * 0.05))}</Typography>
            <Typography sx={{ color: "text.secondary" }}>Bank offers and cashback available at checkout.</Typography>
          </Paper>

          <Typography sx={{ mt: 2, fontWeight: 700 }}>Quantity</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.1, flexWrap: "wrap" }}>
            <Paper sx={{ display: "flex", alignItems: "center", borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: "hidden" }}>
              <IconButton
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={quantity <= 1}
                sx={{ borderRadius: 0 }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <TextField
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setQuantity(Math.min(Math.max(1, Math.floor(next)), maxAvailable || 1));
                }}
                type="number"
                inputProps={{ min: 1, max: maxAvailable || 1, style: { textAlign: "center", width: 56 } }}
                variant="standard"
                sx={{
                  "& .MuiInput-root:before, & .MuiInput-root:after": { display: "none" },
                  "& .MuiInputBase-input": { py: 1.1, fontWeight: 800 }
                }}
              />
              <IconButton
                onClick={() => setQuantity((current) => Math.min(maxAvailable || 1, current + 1))}
                disabled={quantity >= (maxAvailable || 1)}
                sx={{ borderRadius: 0 }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              {maxAvailable ? `${maxAvailable} available` : "Out of stock"}
            </Typography>
          </Stack>

          <Paper sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
            <Typography sx={{ fontWeight: 800 }}>Order total</Typography>
            <Typography sx={{ mt: 0.5 }}>{inr(quantityTotal)}</Typography>
          </Paper>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              mt: 2,
              position: { md: "sticky" },
              bottom: 12,
              bgcolor: theme.palette.contrast.paper,
              border: `1px solid ${theme.palette.contrast.border}`,
              borderRadius: 2,
              p: 1
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={addToCart}
              disabled={!maxAvailable}
              sx={{
                bgcolor: theme.palette.contrast.soft,
                color: theme.palette.contrast.text,
                "&:hover": {
                  bgcolor: theme.palette.contrast.main,
                  color: theme.palette.background.paper
                }
              }}
            >
              Add to Cart
            </Button>
            <Button variant="contained" color="warning" fullWidth onClick={buyNow} disabled={!maxAvailable}>
              Buy at {inr(quantityTotal)}
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Ratings & Reviews</Typography>
            <Typography sx={{ mt: 1, fontSize: 34, fontWeight: 900 }}>
              {product.ratingSummary?.average || "0.0"} / 5
            </Typography>
            <Typography color="text.secondary">
              Based on {product.ratingSummary?.count || 0} verified review{product.ratingSummary?.count === 1 ? "" : "s"}.
            </Typography>

            {isAuthenticated ? (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {canReview ? "Share your experience" : "Review unlocks after purchase"}
                </Typography>
                <TextField
                  select
                  label="Rating"
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                  disabled={!canReview || reviewSubmitting}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <MenuItem key={value} value={value}>{value} Star{value === 1 ? "" : "s"}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Review"
                  multiline
                  minRows={4}
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                  disabled={!canReview || reviewSubmitting}
                  helperText={canReview ? "Your latest review updates your previous one." : "Place an order for this item to leave a review."}
                />
                <Button variant="contained" onClick={submitReview} disabled={!canReview || reviewSubmitting || !reviewForm.comment.trim()}>
                  {reviewSubmitting ? "Saving..." : "Submit Review"}
                </Button>
              </Stack>
            ) : (
              <Alert sx={{ mt: 2 }} severity="info">Login to see whether you can review this product.</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>What shoppers are saying</Typography>
            {!reviews.length ? (
              <Alert severity="info">No reviews yet. Be the first verified buyer to rate this product.</Alert>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={1.5}>
                {reviews.map((review) => (
                  <Box key={review.id} sx={{ py: 0.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.8}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {review.userId === user?.id ? "You" : review.userName || "Verified Buyer"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(review.updatedAt || review.createdAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{review.rating} / 5</Typography>
                    <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{review.comment}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage("")}>
        <Alert severity="info">{message}</Alert>
      </Snackbar>
    </Container>
  );
}
