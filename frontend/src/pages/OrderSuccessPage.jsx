import {
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { inr } from "../utils/currency";

function estimatedDelivery(order) {
  const createdAt = new Date(order?.createdAt || Date.now()).getTime();
  const delivery = new Date(createdAt + 3 * 24 * 60 * 60 * 1000);
  return delivery.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default function OrderSuccessPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order || null;

  if (!order) {
    return (
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            No recent order found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Your checkout is complete only after an order is placed successfully.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button variant="contained" onClick={() => navigate("/orders")}>
              View Orders
            </Button>
            <Button variant="outlined" onClick={() => navigate("/shop")}>
              Continue Shopping
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <Container sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Paper
        sx={{
          p: { xs: 2.2, md: 3 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(18,30,26,0.98), rgba(17,24,39,0.96))"
            : "linear-gradient(135deg, #effcf5, #ffffff 58%, #eef6ff)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CheckCircleRoundedIcon color="success" sx={{ fontSize: 34 }} />
              <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 } }}>
                Order placed successfully
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
              Your order is confirmed and the seller will start preparing it shortly. You can track the latest status from your orders page.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.6 }}>
              <Chip label={`Order ID: ${order.id}`} />
              <Chip icon={<ShoppingBagOutlinedIcon />} label={`${itemCount} item${itemCount === 1 ? "" : "s"}`} />
              <Chip color="success" label={`Delivery by ${estimatedDelivery(order)}`} />
            </Stack>
          </Box>

          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.8}>
            <Typography color="text.secondary">Total Paid</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 30 }}>{inr(order.total || 0)}</Typography>
            {order.discount ? (
              <Typography color="success.main" sx={{ fontWeight: 700 }}>
                You saved {inr(order.discount)} on this order
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }} alignItems="flex-start">
        <Box sx={{ flex: 1, width: "100%" }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>
              What happens next
            </Typography>
            <Stack spacing={1.3}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <CheckCircleRoundedIcon color="success" fontSize="small" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Order confirmed</Typography>
                  <Typography variant="body2" color="text.secondary">
                    We have received your order and locked the price for all selected items.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <LocalShippingOutlinedIcon color="info" fontSize="small" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Packing and shipment</Typography>
                  <Typography variant="body2" color="text.secondary">
                    The seller will pack your order and dispatch it for delivery updates soon.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <PlaceOutlinedIcon color="secondary" fontSize="small" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Expected delivery</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your package is expected by {estimatedDelivery(order)} at the selected delivery address.
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>
              Order summary
            </Typography>
            <Stack spacing={1.1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>{inr(order.subtotal || order.total || 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Discount</Typography>
                <Typography color="success.main">- {inr(order.discount || 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography color="text.secondary">Payment method</Typography>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <PaymentsOutlinedIcon fontSize="small" color="action" />
                  <Typography>{order.paymentMethod || "Cash on Delivery"}</Typography>
                </Stack>
              </Stack>
              {order.deliveryAddress ? (
                <Stack spacing={0.6}>
                  <Typography color="text.secondary">Delivery address</Typography>
                  <Typography variant="body2">{order.deliveryAddress}</Typography>
                </Stack>
              ) : null}
              <Divider sx={{ my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800 }}>Total amount</Typography>
                <Typography sx={{ fontWeight: 900 }}>{inr(order.total || 0)}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.2}>
              <Button
                variant="contained"
                endIcon={<EastRoundedIcon />}
                onClick={() => navigate("/orders", { state: { message: "Your order was placed successfully." } })}
              >
                Track this order
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/orders/${order.id}`, { state: { order } })}>
                View order details
              </Button>
              <Button onClick={() => navigate("/shop")}>Continue shopping</Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
}
