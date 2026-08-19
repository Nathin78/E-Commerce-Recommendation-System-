import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import api from "../services/api";
import socket from "../services/socket";
import { useLocation, useNavigate } from "react-router-dom";
import { inr } from "../utils/currency";
import ProductImage from "../components/ProductImage";

function getOrderStatus(order) {
  const createdAt = new Date(order.createdAt).getTime();
  const hoursSinceOrder = (Date.now() - createdAt) / (1000 * 60 * 60);

  if (hoursSinceOrder < 1) {
    return {
      label: "Order Confirmed",
      helper: "Seller is preparing your shipment",
      color: "success"
    };
  }

  if (hoursSinceOrder < 24) {
    return {
      label: "Packed",
      helper: "Expected to move to courier soon",
      color: "info"
    };
  }

  return {
    label: "Shipped",
    helper: "On the way to your delivery address",
    color: "secondary"
  };
}

function getOrderTitle(order) {
  const itemNames = (order.items || []).map((item) => item.name).filter(Boolean);
  if (!itemNames.length) return "Order";
  if (itemNames.length === 1) return itemNames[0];
  return `${itemNames[0]} + ${itemNames.length - 1} more item${itemNames.length - 1 === 1 ? "" : "s"}`;
}

function getUniqueSizes(order) {
  return [...new Set((order.items || []).map((item) => item.size).filter(Boolean))];
}

function estimateDelivery(order) {
  const placed = new Date(order.createdAt);
  const delivery = new Date(placed.getTime() + 3 * 24 * 60 * 60 * 1000);
  return delivery.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [error, setError] = useState("");
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const successMessage = location.state?.message || "";

  useEffect(() => {
    const loadOrders = () => {
      Promise.all([api.get("/orders"), api.get("/products")])
        .then(([ordersRes, productsRes]) => {
          setOrders((ordersRes.data.orders || []).slice().reverse());
          const productMap = Object.fromEntries((productsRes.data.products || []).map((product) => [product.id, product]));
          setProductsById(productMap);
        })
        .catch((e) => setError(e.response?.data?.message || "Failed to load orders"));
    };

    loadOrders();
    socket.on("purchase:new", loadOrders);

    return () => {
      socket.off("purchase:new", loadOrders);
    };
  }, []);

  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += Number(order.total || 0);
        acc.discount += Number(order.discount || 0);
        acc.items += Number(order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0);
        return acc;
      },
      { total: 0, discount: 0, items: 0 }
    );
  }, [orders]);

  return (
    <Container sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Paper
        sx={{
          mb: 2.2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(20,26,46,0.98), rgba(17,24,39,0.96))"
            : "linear-gradient(135deg, #eef6ff, #ffffff 58%, #fff5e8)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 } }}>
              My Orders
            </Typography>
            <Typography sx={{ mt: 0.7, color: "text.secondary", maxWidth: 620 }}>
              Track your recent purchases, review price savings, and jump into detailed delivery updates.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShoppingBagOutlinedIcon />} label={`${orders.length} orders`} />
            <Chip icon={<LocalShippingOutlinedIcon />} label={`${summary.items} items`} />
            <Chip icon={<ConfirmationNumberOutlinedIcon />} label={`${inr(summary.discount)} saved`} color="success" />
          </Stack>
        </Stack>
      </Paper>

      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {!orders.length ? <Alert severity="info">No orders yet.</Alert> : null}

      <Stack spacing={1.6}>
        {orders.map((order) => {
          const status = getOrderStatus(order);
          const sizes = getUniqueSizes(order);
          const previewItem = order.items?.[0];
          const previewImage = previewItem?.image || productsById[previewItem?.productId]?.image;

          return (
            <Paper
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`, { state: { order } })}
              sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: theme.palette.info.main,
                  boxShadow: theme.palette.mode === "dark"
                    ? "0 16px 28px rgba(0,0,0,0.28)"
                    : "0 16px 28px rgba(37,99,235,0.08)"
                }
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}>
                <Box sx={{ flex: 1, p: { xs: 1.8, md: 2.2 } }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 2.5,
                        overflow: "hidden",
                        bgcolor: theme.palette.mode === "dark" ? "rgba(96,165,250,0.14)" : "#eef4ff",
                        border: `1px solid ${theme.palette.divider}`,
                        flexShrink: 0
                      }}
                    >
                      <ProductImage
                        src={previewImage}
                        alt={previewItem?.name || "Ordered product"}
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: 16, sm: 18 } }}>
                        {getOrderTitle(order)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                        Order ID: {order.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Placed on {new Date(order.createdAt).toLocaleString()}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Chip size="small" label={`${order.items?.length || 0} product${order.items?.length === 1 ? "" : "s"}`} />
                        {sizes.length ? <Chip size="small" variant="outlined" label={`Size${sizes.length === 1 ? "" : "s"}: ${sizes.join(", ")}`} /> : null}
                        {order.appliedCoupon?.code ? <Chip size="small" color="success" label={`Coupon ${order.appliedCoupon.code}`} /> : null}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>

                <Box sx={{ width: { xs: "100%", md: 290 }, p: { xs: 1.8, md: 2.2 }, bgcolor: theme.palette.mode === "dark" ? "rgba(248,250,252,0.02)" : "#fbfcff" }}>
                  <Stack spacing={1.1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{inr(order.total)}</Typography>
                      <Chip
                        icon={<CheckCircleRoundedIcon />}
                        label={status.label}
                        color={status.color}
                        size="small"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {status.helper}
                    </Typography>
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                      Delivery expected by {estimateDelivery(order)}
                    </Typography>
                    <Divider />
                    <Typography variant="body2" color="text.secondary">
                      Subtotal: {inr(order.subtotal || order.total || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Discount: {inr(order.discount || 0)}
                    </Typography>
                    <Button
                      endIcon={<KeyboardArrowRightRoundedIcon />}
                      sx={{ alignSelf: "flex-start", px: 0.2, mt: 0.4 }}
                    >
                      View order details
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Container>
  );
}
