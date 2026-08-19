import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import api from "../services/api";
import ProductImage from "../components/ProductImage";
import { inr } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const paymentOptions = [
  "Cash on Delivery",
  "UPI",
  "Credit / Debit Card",
  "Net Banking"
];

function formatAddress(address) {
  return [address.street, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}

export default function CheckoutPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    recipient: user?.name || "",
    mobile: "",
    street: user?.address || "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false
  });
  const [form, setForm] = useState({
    fullName: user?.name || "",
    mobile: "",
    deliveryAddress: user?.address || "",
    paymentMethod: "Cash on Delivery"
  });

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === defaultAddressId) || null,
    [addresses, defaultAddressId]
  );

  useEffect(() => {
    Promise.all([api.get("/cart"), api.get("/users/addresses")])
      .then(([cartRes, addressRes]) => {
        setCart(cartRes.data.cart);
        if (!(cartRes.data.cart?.items || []).length) {
          navigate("/cart", { replace: true });
          return;
        }

        const loadedAddresses = addressRes.data.addresses || [];
        setAddresses(loadedAddresses);
        const preferredAddressId = addressRes.data.defaultAddressId || loadedAddresses.find((address) => address.isDefault)?.id || "";
        setDefaultAddressId(preferredAddressId);

        const preferredAddress = loadedAddresses.find((address) => address.id === preferredAddressId);
        if (preferredAddress) {
          setForm((current) => ({
            ...current,
            fullName: preferredAddress.recipient || current.fullName,
            mobile: preferredAddress.mobile || "",
            deliveryAddress: formatAddress(preferredAddress)
          }));
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load checkout details");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const itemCount = useMemo(
    () => (cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  const applySelectedAddress = (address) => {
    setDefaultAddressId(address.id);
    setForm((current) => ({
      ...current,
      fullName: address.recipient || current.fullName,
      mobile: address.mobile || "",
      deliveryAddress: formatAddress(address)
    }));
    api.put(`/users/addresses/${address.id}/default`).catch(() => {});
  };

  const saveAddress = async () => {
    if (!addressForm.recipient.trim() || !addressForm.street.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      setError("Please complete all required address fields");
      return;
    }

    try {
      const { data } = await api.post("/users/addresses", addressForm);
      setAddresses(data.addresses || []);
      setDefaultAddressId(data.defaultAddressId || "");
      const nextSelected = (data.addresses || []).find((address) => address.id === data.defaultAddressId) || null;
      if (nextSelected) {
        setForm((current) => ({
          ...current,
          fullName: nextSelected.recipient || current.fullName,
          mobile: nextSelected.mobile || "",
          deliveryAddress: formatAddress(nextSelected)
        }));
      }
      setAddressDialogOpen(false);
      setAddressForm({
        label: "Home",
        recipient: user?.name || "",
        mobile: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    }
  };

  const placeOrder = async () => {
    if (!form.fullName.trim() || !form.deliveryAddress.trim() || !form.paymentMethod.trim()) {
      setError("Please complete delivery and payment details");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/orders", {
        deliveryAddress: `${form.fullName.trim()}${form.mobile.trim() ? `, ${form.mobile.trim()}` : ""}, ${form.deliveryAddress.trim()}`,
        paymentMethod: form.paymentMethod
      });
      navigate("/order-success", {
        replace: true,
        state: { order: data.order }
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}><CircularProgress /></Box>;
  }

  if (error && !cart) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
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
          background: theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(20,26,46,0.98), rgba(17,24,39,0.96))"
            : "linear-gradient(135deg, #eef6ff, #ffffff 58%, #eefbf6)"
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Place Order</Typography>
        <Typography sx={{ mt: 0.7, color: "text.secondary", maxWidth: 620 }}>
          Complete delivery details, choose a payment method, and confirm your order in a Flipkart-style checkout flow.
        </Typography>
        <Stepper activeStep={2} alternativeLabel sx={{ mt: 2.2 }}>
          <Step><StepLabel>Cart</StepLabel></Step>
          <Step><StepLabel>Address</StepLabel></Step>
          <Step><StepLabel>Payment</StepLabel></Step>
        </Stepper>
      </Paper>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, width: "100%" }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PlaceOutlinedIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Saved Addresses</Typography>
                </Stack>
                <Button onClick={() => setAddressDialogOpen(true)}>Add Address</Button>
              </Stack>

              <Stack spacing={1.2}>
                {addresses.length ? addresses.map((address) => (
                  <Paper
                    key={address.id}
                    variant="outlined"
                    onClick={() => applySelectedAddress(address)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      borderColor: defaultAddressId === address.id ? theme.palette.info.main : theme.palette.divider,
                      bgcolor: defaultAddressId === address.id
                        ? (theme.palette.mode === "dark" ? "rgba(96,165,250,0.08)" : "#f3f8ff")
                        : theme.palette.background.paper
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 800 }}>{address.label}</Typography>
                          {address.isDefault ? <Chip size="small" label="Default" color="success" /> : null}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                          {address.recipient}{address.mobile ? ` | ${address.mobile}` : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatAddress(address)}
                        </Typography>
                      </Box>
                      <Button size="small" variant={defaultAddressId === address.id ? "contained" : "outlined"}>
                        Deliver Here
                      </Button>
                    </Stack>
                  </Paper>
                )) : (
                  <Alert severity="info">No saved addresses yet. Add one to speed up checkout.</Alert>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                <HomeWorkOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Selected Delivery Details</Typography>
              </Stack>
              <Stack spacing={1.4}>
                <TextField
                  label="Full Name"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Mobile Number"
                  value={form.mobile}
                  onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Delivery Address"
                  value={form.deliveryAddress}
                  onChange={(event) => setForm((current) => ({ ...current, deliveryAddress: event.target.value }))}
                  multiline
                  minRows={4}
                  fullWidth
                />
                {selectedAddress ? (
                  <Typography variant="body2" color="text.secondary">
                    Using saved address: {selectedAddress.label}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                <PaymentsOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Payment Option</Typography>
              </Stack>
              <TextField
                select
                fullWidth
                label="Select Payment Method"
                value={form.paymentMethod}
                onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              >
                {paymentOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                <Inventory2OutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Order Items</Typography>
              </Stack>
              <Stack spacing={1.4}>
                {(cart?.items || []).map((item, index) => (
                  <Paper key={`${item.productId}-${item.size}-${index}`} variant="outlined" sx={{ p: 1.4, borderRadius: 2.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} justifyContent="space-between">
                      <Stack direction="row" spacing={1.3}>
                        <Box sx={{ width: 76, height: 76, borderRadius: 2, overflow: "hidden", border: `1px solid ${theme.palette.divider}` }}>
                          <ProductImage src={item.product?.image} alt={item.product?.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>{item.product?.name}</Typography>
                          <Typography variant="body2" color="text.secondary">Size: {item.size || "M"} | Qty: {item.quantity}</Typography>
                          <Typography variant="body2" color="text.secondary">Delivery by Tomorrow, {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}</Typography>
                        </Box>
                      </Stack>
                      <Typography sx={{ fontWeight: 900 }}>{inr(item.totalPrice)}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Box>

        <Box sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, position: { xl: "sticky" }, top: { xl: 92 } }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>Order Summary</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
              <Chip icon={<Inventory2OutlinedIcon />} label={`${itemCount} items`} />
              {cart?.appliedCoupon?.code ? <Chip icon={<LocalOfferOutlinedIcon />} color="success" label={cart.appliedCoupon.code} /> : null}
            </Stack>
            <Stack spacing={1.1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>{inr(cart?.subtotal || 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Discount</Typography>
                <Typography color="success.main">- {inr(cart?.discount || 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Delivery</Typography>
                <Typography color="success.main">FREE</Typography>
              </Stack>
              <Divider sx={{ my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800 }}>Total Payable</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{inr(cart?.total || 0)}</Typography>
              </Stack>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 16, mr: 0.7, verticalAlign: "text-bottom" }} />
                You save {inr(cart?.discount || 0)} on this order
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={placeOrder}
                disabled={submitting || !(cart?.items || []).length}
                sx={{ mt: 1.2 }}
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>

      <Dialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Address</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.4} sx={{ mt: 1 }}>
            <TextField label="Label" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} fullWidth />
            <TextField label="Recipient" value={addressForm.recipient} onChange={(event) => setAddressForm((current) => ({ ...current, recipient: event.target.value }))} fullWidth />
            <TextField label="Mobile" value={addressForm.mobile} onChange={(event) => setAddressForm((current) => ({ ...current, mobile: event.target.value }))} fullWidth />
            <TextField label="Street Address" value={addressForm.street} onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
              <TextField label="City" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} fullWidth />
              <TextField label="State" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} fullWidth />
            </Stack>
            <TextField label="Pincode" value={addressForm.pincode} onChange={(event) => setAddressForm((current) => ({ ...current, pincode: event.target.value }))} fullWidth />
            <TextField
              select
              label="Make default"
              value={addressForm.isDefault ? "yes" : "no"}
              onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.value === "yes" }))}
              fullWidth
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddressDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAddress}>Save Address</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
