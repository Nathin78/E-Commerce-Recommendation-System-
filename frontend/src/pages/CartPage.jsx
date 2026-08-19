import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import api from "../services/api";
import socket from "../services/socket";
import { inr } from "../utils/currency";
import ProductImage from "../components/ProductImage";
import { useNavigate } from "react-router-dom";

function estimateDelivery() {
  const delivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return delivery.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default function CartPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [offers, setOffers] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadCart = async () => {
    setLoading(true);
    try {
      const [{ data }, offersRes] = await Promise.all([api.get("/cart"), api.get("/cart/offers")]);
      setCart(data.cart);
      setCouponCode(data.cart?.appliedCoupon?.code || "");
      setOffers(offersRes.data.offers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    const onPurchase = () => loadCart();
    const onFlashChange = () => loadCart();
    socket.on("purchase:new", onPurchase);
    socket.on("flashSale:created", onFlashChange);
    socket.on("flashSale:started", onFlashChange);
    socket.on("flashSale:expired", onFlashChange);

    return () => {
      socket.off("purchase:new", onPurchase);
      socket.off("flashSale:created", onFlashChange);
      socket.off("flashSale:started", onFlashChange);
      socket.off("flashSale:expired", onFlashChange);
    };
  }, []);

  const removeItem = async (productId, size) => {
    try {
      await api.post("/cart", { productId, action: "remove", size });
      loadCart();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to remove item");
    }
  };

  const changeQuantity = async (productId, quantity, action = "set", size) => {
    try {
      await api.post("/cart", { productId, quantity, action, size });
      loadCart();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update quantity");
    }
  };

  const applyCoupon = async (code = couponCode) => {
    try {
      const { data } = await api.post("/cart/coupon", { code });
      setCart(data.cart);
      setCouponCode(data.cart?.appliedCoupon?.code || "");
      setMessage(data.message || "Coupon updated");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to apply coupon");
    }
  };

  const clearCart = async () => {
    try {
      const { data } = await api.post("/cart", { action: "clear" });
      setCart(data.cart);
      setCouponCode("");
      setMessage(data.message || "Cart cleared");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to clear cart");
    }
  };

  const summary = useMemo(() => {
    const itemCount = (cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return {
      itemCount,
      subtotal: cart?.subtotal || 0,
      discount: cart?.discount || 0,
      total: cart?.total || 0
    };
  }, [cart]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Paper
        sx={{
          mb: 2.2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(20,26,46,0.98), rgba(17,24,39,0.96))"
              : "linear-gradient(135deg, #eef6ff, #ffffff 58%, #fff5e8)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
              My Cart
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
              Review your selected items, apply offers, and move to checkout with a cleaner marketplace-style cart.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShoppingCartOutlinedIcon />} label={`${summary.itemCount} items`} />
            <Chip icon={<LocalOfferOutlinedIcon />} label={`${inr(summary.discount)} saved`} color="success" />
            <Chip icon={<ShieldOutlinedIcon />} label="Secure checkout" />
          </Stack>
        </Stack>
      </Paper>

      {message ? (
        <Alert sx={{ mb: 2 }} severity="info">
          {message}
        </Alert>
      ) : null}
      {!cart?.items?.length ? <Alert severity="info">Your cart is empty.</Alert> : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, width: "100%" }}>
          <Stack spacing={1.6}>
            {cart?.items?.map((item, index) => (
              <Paper
                key={`${item.productId}-${item.size}-${index}`}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper,
                  overflow: "hidden"
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}
                >
                  <Box sx={{ flex: 1, p: { xs: 1.8, md: 2.1 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6} alignItems={{ xs: "flex-start", sm: "center" }}>
                      <Box
                        sx={{
                          width: 96,
                          height: 96,
                          borderRadius: 2.5,
                          overflow: "hidden",
                          bgcolor: theme.palette.mode === "dark" ? "rgba(96,165,250,0.14)" : "#eef4ff",
                          border: `1px solid ${theme.palette.divider}`,
                          flexShrink: 0
                        }}
                      >
                        <ProductImage
                          src={item.product?.image}
                          alt={item.product?.name || "Cart item"}
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: 16, sm: 18 } }}>{item.product.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                          Brand: {item.product.brand || "Generic"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Size: {item.size || item.product.sizes?.[0] || "M"}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          <Chip size="small" label={`Unit ${inr(item.unitPrice)}`} />
                          {item.flashSale ? <Chip size="small" color="error" icon={<FlashOnRoundedIcon />} label="Flash sale price" /> : null}
                          <Chip size="small" variant="outlined" label={`Delivery by ${estimateDelivery()}`} />
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      width: { xs: "100%", md: 280 },
                      p: { xs: 1.8, md: 2.1 },
                      bgcolor: theme.palette.mode === "dark" ? "rgba(248,250,252,0.02)" : "#fbfcff"
                    }}
                  >
                    <Stack spacing={1.2}>
                      <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{inr(item.totalPrice)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} x {inr(item.unitPrice)}
                      </Typography>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: 0.8,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderColor: theme.palette.divider
                        }}
                      >
                        <IconButton size="small" onClick={() => changeQuantity(item.productId, 1, "decrement", item.size)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ fontWeight: 800 }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => changeQuantity(item.productId, 1, "add", item.size)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Paper>

                      <Button
                        color="error"
                        variant="text"
                        onClick={() => removeItem(item.productId, item.size)}
                        sx={{ alignSelf: "flex-start", px: 0.2 }}
                      >
                        Remove item
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <Stack spacing={2} sx={{ position: { xl: "sticky" }, top: { xl: 92 } }}>
            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Offers & Coupons
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap" }} useFlexGap>
                {offers.map((offer) => (
                  <Chip
                    key={offer.code}
                    label={`${offer.code} - ${offer.description}`}
                    onClick={() => {
                      setCouponCode(offer.code);
                      applyCoupon(offer.code);
                    }}
                    color={cart?.appliedCoupon?.code === offer.code ? "success" : "default"}
                    variant={cart?.appliedCoupon?.code === offer.code ? "filled" : "outlined"}
                  />
                ))}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row", xl: "column" }} spacing={1} sx={{ mt: 1.6 }}>
                <TextField
                  fullWidth
                  label="Coupon code"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={() => applyCoupon()} sx={{ minWidth: 110 }}>
                    Apply
                  </Button>
                  <Button variant="outlined" onClick={() => applyCoupon("")}>
                    Clear
                  </Button>
                  <Button variant="outlined" color="error" onClick={clearCart} disabled={!cart?.items?.length}>
                    Clear cart
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>
                Price Details
              </Typography>
              <Stack spacing={1.1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography>{inr(summary.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Discount</Typography>
                  <Typography color="success.main">- {inr(summary.discount)}</Typography>
                </Stack>
                {cart?.appliedCoupon ? (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Coupon applied</Typography>
                    <Typography>{cart.appliedCoupon.code}</Typography>
                  </Stack>
                ) : null}
                <Divider sx={{ my: 0.4 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 800 }}>Total amount</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{inr(summary.total)}</Typography>
                </Stack>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                  You will save {inr(summary.discount)} on this order
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expected delivery by {estimateDelivery()}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                  <Button
                    disabled={!cart?.items?.length}
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/checkout")}
                    endIcon={<KeyboardArrowRightRoundedIcon />}
                    sx={{ flex: 1 }}
                  >
                    Continue to Checkout
                  </Button>
                  <Button
                    disabled={!cart?.items?.length}
                    variant="outlined"
                    color="error"
                    size="large"
                    onClick={clearCart}
                    sx={{ flex: 1 }}
                  >
                    Clear cart
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
