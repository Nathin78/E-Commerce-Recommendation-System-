import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DiscountOutlinedIcon from "@mui/icons-material/DiscountOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useLocation, useParams } from "react-router-dom";
import api from "../services/api";
import { inr } from "../utils/currency";
import ProductImage from "../components/ProductImage";

const TRACKING_STEPS = ["confirmed", "packed", "shipped", "delivered"];

function estimatedDelivery(order) {
  const delivery = new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);
  return delivery.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function orderHeader(order) {
  if (!order?.items?.length) return "Order Details";
  if (order.items.length === 1) return order.items[0].name;
  return `${order.items[0].name} + ${order.items.length - 1} more`;
}

function getActiveStep(order) {
  const index = TRACKING_STEPS.indexOf(order.status);
  if (index >= 0) return index;
  if (order.status === "return_requested" || order.status === "returned") return 3;
  return 0;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [productsById, setProductsById] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const theme = useTheme();

  useEffect(() => {
    Promise.all([api.get("/orders"), api.get("/products")])
      .then(([ordersRes, productsRes]) => {
        const productMap = Object.fromEntries((productsRes.data.products || []).map((product) => [product.id, product]));
        setProductsById(productMap);

        const found = (ordersRes.data.orders || []).find((item) => item.id === id);
        if (found) {
          setOrder(found);
        } else {
          setError("Order not found");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load order");
      });
  }, [id]);

  const lineItemsTotal = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [order]
  );

  const cancelOrder = async () => {
    try {
      const { data } = await api.put(`/orders/${order.id}/cancel`);
      setOrder(data.order);
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to cancel order");
    }
  };

  const requestReturn = async () => {
    try {
      const { data } = await api.put(`/orders/${order.id}/return`, { reason: returnReason });
      setOrder(data.order);
      setMessage(data.message);
      setReturnDialogOpen(false);
      setReturnReason("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to request return");
    }
  };

  if (error && !order) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="info">Loading order details...</Alert>
      </Container>
    );
  }

  const activeStep = getActiveStep(order);
  const canCancel = ["confirmed", "packed"].includes(order.status);
  const canReturn = order.status === "delivered";

  return (
    <Container sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === "dark"
            ? "linear-gradient(140deg, rgba(20,26,46,0.98), rgba(17,24,39,0.96))"
            : "linear-gradient(140deg, #f3f8ff, #ffffff 55%, #eefbf6)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 } }}>
              {orderHeader(order)}
            </Typography>
            <Typography sx={{ mt: 0.7, color: "text.secondary" }}>Order ID: {order.id}</Typography>
            <Typography sx={{ color: "text.secondary" }}>Placed on {new Date(order.createdAt).toLocaleString()}</Typography>
            {order.deliveryAddress ? <Typography sx={{ color: "text.secondary" }}>Deliver to: {order.deliveryAddress}</Typography> : null}
          </Box>

          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: 28 }}>{inr(order.total)}</Typography>
            <Chip color="success" label={`Status: ${order.status.replaceAll("_", " ")}`} />
            {order.appliedCoupon?.code ? <Chip icon={<DiscountOutlinedIcon />} label={`Saved with ${order.appliedCoupon.code}`} /> : null}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, width: "100%" }}>
          <Paper sx={{ p: { xs: 2, md: 2.4 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 1.8 }}>Order Tracking Timeline</Typography>
            <Stepper activeStep={activeStep} alternativeLabel>
              {TRACKING_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label[0].toUpperCase() + label.slice(1)}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Inventory2OutlinedIcon color="success" fontSize="small" />
                <Typography variant="body2">Confirmed and recorded successfully.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalShippingOutlinedIcon color="info" fontSize="small" />
                <Typography variant="body2">Shipment updates move automatically with admin status changes.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <HomeOutlinedIcon color="secondary" fontSize="small" />
                <Typography variant="body2">Estimated delivery: {estimatedDelivery(order)}</Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.4 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
              <Typography sx={{ fontWeight: 800 }}>Customer Actions</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} disabled={!canCancel} onClick={cancelOrder}>
                  Cancel Order
                </Button>
                <Button variant="outlined" startIcon={<AutorenewOutlinedIcon />} disabled={!canReturn} onClick={() => setReturnDialogOpen(true)}>
                  Request Return
                </Button>
              </Stack>
            </Stack>
            {!canCancel && !canReturn ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2 }}>
                This order is currently in the "{order.status.replaceAll("_", " ")}" stage, so no customer action is available right now.
              </Typography>
            ) : null}
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.4 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography sx={{ fontWeight: 800, mb: 1.8 }}>Items in this order</Typography>
            <Stack spacing={1.5}>
              {order.items.map((item, index) => (
                <Paper
                  key={`${item.productId}-${item.name}-${index}`}
                  variant="outlined"
                  sx={{ p: 1.6, borderRadius: 2.5, borderColor: theme.palette.divider, bgcolor: theme.palette.mode === "dark" ? "rgba(248,250,252,0.03)" : "#fcfdff" }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6} justifyContent="space-between">
                    <Stack direction="row" spacing={1.4} sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: 2.5, overflow: "hidden", bgcolor: theme.palette.mode === "dark" ? "rgba(96,165,250,0.12)" : "#eef4ff", border: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
                        <ProductImage src={item.image || productsById[item.productId]?.image} alt={item.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }}>{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                          Size: {item.size || "M"} | Qty: {item.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Unit price: {inr(item.unitPrice)}</Typography>
                        {item.usedFlashSale ? <Chip size="small" color="error" label="Flash sale price used" sx={{ mt: 0.9 }} /> : null}
                      </Box>
                    </Stack>
                    <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.5}>
                      <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{inr(item.lineTotal)}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.quantity} x {inr(item.unitPrice)}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ width: { xs: "100%", lg: 350 }, flexShrink: 0 }}>
          <Paper sx={{ p: { xs: 2, md: 2.4 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, position: { lg: "sticky" }, top: 92 }}>
            <Typography sx={{ fontWeight: 800, mb: 1.6 }}>Price Details</Typography>
            <Stack spacing={1.1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Items total</Typography>
                <Typography>{inr(lineItemsTotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Order subtotal</Typography>
                <Typography>{inr(order.subtotal || order.total || 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Discount</Typography>
                <Typography color="success.main">- {inr(order.discount || 0)}</Typography>
              </Stack>
              {order.appliedCoupon?.code ? (
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Coupon applied</Typography>
                  <Typography>{order.appliedCoupon.code}</Typography>
                </Stack>
              ) : null}
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Payment method</Typography>
                <Typography>{order.paymentMethod || "Cash on Delivery"}</Typography>
              </Stack>
              <Divider sx={{ my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800 }}>Total amount</Typography>
                <Typography sx={{ fontWeight: 900 }}>{inr(order.total)}</Typography>
              </Stack>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                You saved {inr(order.discount || 0)} on this order
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography sx={{ fontWeight: 800, mb: 1 }}>Delivery updates</Typography>
            <Stack spacing={1}>
              {(order.statusHistory || []).map((entry, index) => (
                <Typography key={`${entry.status}-${entry.at}-${index}`} variant="body2" color="text.secondary">
                  {entry.status.replaceAll("_", " ")}: {new Date(entry.at).toLocaleString()}
                  {entry.note ? ` - ${entry.note}` : ""}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Return</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Reason"
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
            multiline
            minRows={4}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={requestReturn} disabled={!returnReason.trim()}>Submit Return</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
