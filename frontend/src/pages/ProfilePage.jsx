import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
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
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function formatSavedAddress(address) {
  if (!address) return "";
  return [address.street, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}

function getDefaultAddress(addresses, defaultAddressId) {
  return addresses.find((address) => address.id === defaultAddressId) || addresses.find((address) => address.isDefault) || addresses[0] || null;
}

function buildProfileForm(user, defaultAddress) {
  return {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || defaultAddress?.mobile || "",
    address: user?.address || formatSavedAddress(defaultAddress)
  };
}

function blankAddressForm(user) {
  return {
    id: null,
    label: "Home",
    recipient: user?.name || "",
    mobile: user?.phone || "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false
  };
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getErrorMessage(result, fallback) {
  return result?.status === "rejected"
    ? result.reason?.response?.data?.message || fallback
    : "";
}

function AccountMenuItem({ icon, title, subtitle, active = false, danger = false, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1.6,
        cursor: onClick ? "pointer" : "default",
        borderLeft: "4px solid",
        borderLeftColor: active ? "#2874f0" : "transparent",
        bgcolor: active ? "rgba(40,116,240,0.08)" : "transparent",
        transition: "background-color 0.2s ease",
        "&:hover": {
          bgcolor: onClick ? "action.hover" : "transparent"
        }
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          color: danger ? "error.main" : active ? "#2874f0" : "text.secondary",
          bgcolor: danger ? "rgba(239,68,68,0.08)" : active ? "rgba(40,116,240,0.12)" : "action.hover"
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: danger ? "error.main" : "text.primary" }}>{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function MetricTile({ icon, label, value, accent }) {
  return (
    <Paper elevation={0} sx={{ p: 2, height: "100%", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: "grid", placeItems: "center", color: accent, bgcolor: `${accent}14` }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

const SectionShell = forwardRef(function SectionShell({ title, action, children }, ref) {
  return (
    <Paper ref={ref} elevation={0} sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, md: 3 }, py: 2.2, bgcolor: "background.paper" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>{title}</Typography>
        {action}
      </Stack>
      <Divider />
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, bgcolor: "background.paper" }}>
        {children}
      </Box>
    </Paper>
  );
});

export default function ProfilePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, updateAuthUser, logout } = useAuth();
  const profileFormRef = useRef(null);
  const addressSectionRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressForm, setAddressForm] = useState(blankAddressForm(user));
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
    if (message) setMessage("");
  };

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      api.get("/users/profile"),
      api.get("/users/addresses"),
      api.get("/users/wishlist"),
      api.get("/orders")
    ])
      .then(([profileRes, addressesRes, wishlistRes, ordersRes]) => {
        if (cancelled) return;

        const nextUser = profileRes.status === "fulfilled" ? profileRes.value.data.user : user;
        const loadedAddresses = addressesRes.status === "fulfilled" ? addressesRes.value.data.addresses || [] : [];
        const defaultAddressId = addressesRes.status === "fulfilled"
          ? addressesRes.value.data.defaultAddressId || nextUser?.defaultAddressId || null
          : nextUser?.defaultAddressId || null;
        const preferredAddress = getDefaultAddress(loadedAddresses, defaultAddressId);

        if (nextUser) {
          setProfile(nextUser);
          setForm(buildProfileForm(nextUser, preferredAddress));
        }
        setAddresses(loadedAddresses);
        setWishlistCount(wishlistRes.status === "fulfilled" ? (wishlistRes.value.data.wishlist || []).length : 0);
        setOrdersCount(ordersRes.status === "fulfilled" ? (ordersRes.value.data.orders || []).length : 0);

        const loadErrors = [
          getErrorMessage(profileRes, "Failed to load profile"),
          getErrorMessage(addressesRes, "Failed to load addresses"),
          getErrorMessage(wishlistRes, "Failed to load wishlist"),
          getErrorMessage(ordersRes, "Failed to load orders")
        ].filter(Boolean);

        setError(loadErrors[0] || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const defaultAddress = useMemo(
    () => getDefaultAddress(addresses, profile?.defaultAddressId || null),
    [addresses, profile?.defaultAddressId]
  );

  const accountAddress = useMemo(
    () => form.address.trim() || formatSavedAddress(defaultAddress),
    [form.address, defaultAddress]
  );

  const resetForm = () => {
    setForm(buildProfileForm(profile, defaultAddress));
    setError("");
    setMessage("");
  };

  const handleSave = async () => {
    const normalizedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: accountAddress
    };

    if (!normalizedForm.name || !normalizedForm.email || !normalizedForm.address) {
      setError("Name, email, and address are required");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.put("/users/profile", normalizedForm);
      const nextUser = data.user;
      const nextAddresses = Array.isArray(nextUser.addresses) ? nextUser.addresses : addresses;
      const nextDefaultAddress = getDefaultAddress(nextAddresses, nextUser.defaultAddressId || null);
      setProfile(nextUser);
      setAddresses(nextAddresses);
      updateAuthUser(data.user, data.token);
      setForm(buildProfileForm(nextUser, nextDefaultAddress));
      setMessage("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const openAddressDialog = (address = null) => {
    if (address) {
      setAddressForm({
        id: address.id,
        label: address.label || "Address",
        recipient: address.recipient || "",
        mobile: address.mobile || "",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        isDefault: Boolean(address.isDefault)
      });
    } else {
      setAddressForm(blankAddressForm(profile || user));
    }
    setAddressDialogOpen(true);
  };

  const saveAddress = async () => {
    if (!addressForm.recipient.trim() || !addressForm.street.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      setError("Please complete all required address fields");
      return;
    }

    setAddressSaving(true);
    setError("");

    try {
      const endpoint = addressForm.id ? `/users/addresses/${addressForm.id}` : "/users/addresses";
      const method = addressForm.id ? api.put : api.post;
      const { data } = await method(endpoint, {
        label: addressForm.label,
        recipient: addressForm.recipient,
        mobile: addressForm.mobile,
        street: addressForm.street,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode,
        isDefault: addressForm.isDefault
      });
      setAddresses(data.addresses || []);
      setProfile((current) => current ? { ...current, defaultAddressId: data.defaultAddressId } : current);
      setAddressDialogOpen(false);
      setAddressForm(blankAddressForm(profile || user));
      setMessage(addressForm.id ? "Address updated successfully" : "Address added successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const { data } = await api.put(`/users/addresses/${addressId}/default`);
      setAddresses(data.addresses || []);
      setProfile((current) => current ? { ...current, defaultAddressId: data.defaultAddressId } : current);
      setMessage("Default address updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update default address");
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const { data } = await api.delete(`/users/addresses/${addressId}`);
      setAddresses(data.addresses || []);
      setProfile((current) => current ? { ...current, defaultAddressId: data.defaultAddressId } : current);
      setMessage("Address removed successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove address");
    }
  };

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const paletteBlue = theme.palette.mode === "dark" ? "#60a5fa" : "#2874f0";
  const pageBg = theme.palette.mode === "dark" ? "#0f172a" : "#f1f3f6";
  const heroBg = theme.palette.mode === "dark"
    ? "linear-gradient(135deg, #102449, #173b74)"
    : "linear-gradient(135deg, #2874f0, #1c5fd4)";

  return (
    <Box sx={{ bgcolor: pageBg, minHeight: "100%", py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2.2} alignItems="flex-start">
          <Box sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
            <Paper elevation={0} sx={{ borderRadius: 0, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ p: 2.2, bgcolor: "background.paper" }}>
                <Stack direction="row" spacing={1.6} alignItems="center">
                  <Avatar sx={{ width: 58, height: 58, bgcolor: paletteBlue, color: "#fff", fontWeight: 800 }}>
                    {getInitials(profile?.name) || <PersonOutlineRoundedIcon />}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">Hello,</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 20 }} noWrap>{profile?.name || "Customer"}</Typography>
                  </Box>
                </Stack>
              </Box>
              <Divider />
              <Box sx={{ bgcolor: "background.paper" }}>
                <AccountMenuItem icon={<Inventory2OutlinedIcon fontSize="small" />} title="My Orders" subtitle="Track, return, or buy things again" onClick={() => navigate("/orders")} />
                <Divider />
                <AccountMenuItem icon={<FavoriteBorderOutlinedIcon fontSize="small" />} title="My Wishlist" subtitle="Your saved items all in one place" onClick={() => navigate("/wishlist")} />
                <Divider />
                <AccountMenuItem icon={<PersonOutlineRoundedIcon fontSize="small" />} title="Profile Information" subtitle="Manage your name, email, and phone" active onClick={() => scrollToSection(profileFormRef)} />
                <Divider />
                <AccountMenuItem icon={<PlaceOutlinedIcon fontSize="small" />} title="Saved Addresses" subtitle={`${addresses.length} saved address${addresses.length === 1 ? "" : "es"}`} onClick={() => scrollToSection(addressSectionRef)} />
                <Divider />
                <AccountMenuItem
                  icon={<LogoutRoundedIcon fontSize="small" />}
                  title="Logout"
                  subtitle="Sign out from this device"
                  danger
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                />
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, width: "100%" }}>
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 0, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <Box sx={{ p: { xs: 2.2, md: 3 }, color: "#fff", background: heroBg }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, letterSpacing: 1.1 }}>ACCOUNT OVERVIEW</Typography>
                    <Typography variant="h4" sx={{ mt: 0.8, fontWeight: 900, fontSize: { xs: 28, md: 36 } }}>
                      Manage your customer profile
                    </Typography>
                    <Typography sx={{ mt: 1, maxWidth: 760, opacity: 0.92 }}>
                      Update account details, manage multiple delivery addresses, and keep order communication information current.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={user?.role === "admin" ? "Admin account" : "Customer account"} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }} />
                    <Chip label={`${ordersCount} orders`} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }} />
                    <Chip label={`${wishlistCount} wishlist`} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }} />
                  </Stack>
                </Stack>
              </Box>
            </Paper>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2, mb: 2 }}>
              <MetricTile icon={<Inventory2OutlinedIcon />} label="Total Orders" value={ordersCount} accent="#2874f0" />
              <MetricTile icon={<FavoriteBorderOutlinedIcon />} label="Wishlist Items" value={wishlistCount} accent="#e67e22" />
              <MetricTile icon={<PlaceOutlinedIcon />} label="Saved Addresses" value={addresses.length} accent="#0f9d58" />
              <MetricTile icon={<VerifiedUserOutlinedIcon />} label="Account Status" value={user?.role === "admin" ? "Admin" : "Active"} accent="#7c3aed" />
            </Box>

            <Stack spacing={2}>
              <SectionShell
                ref={profileFormRef}
                title="Personal Information"
                action={<Button variant="text" onClick={() => scrollToSection(profileFormRef)} sx={{ color: paletteBlue, fontWeight: 700 }}>Edit</Button>}
              >
                <Stack spacing={2.2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField label="Full Name" value={form.name} onChange={(event) => updateField("name", event.target.value)} fullWidth />
                    <TextField label="Phone Number" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} fullWidth />
                  </Stack>
                  <TextField label="Email Address" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} fullWidth />
                  <TextField label="Residential Address" value={form.address} onChange={(event) => updateField("address", event.target.value)} multiline minRows={4} fullWidth />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
                    <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: "#2874f0", "&:hover": { bgcolor: "#1c5fd4" } }}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </Stack>
                </Stack>
              </SectionShell>

              <SectionShell
                ref={addressSectionRef}
                title="Manage Addresses"
                action={
                  <Stack direction="row" spacing={1}>
                    {defaultAddress ? <Chip size="small" icon={<WorkspacePremiumOutlinedIcon />} label={defaultAddress.label || "Default"} sx={{ bgcolor: "rgba(40,116,240,0.1)", color: paletteBlue }} /> : null}
                    <Button variant="contained" startIcon={<AddLocationAltOutlinedIcon />} onClick={() => openAddressDialog()} sx={{ bgcolor: "#2874f0", "&:hover": { bgcolor: "#1c5fd4" } }}>
                      Add Address
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={2}>
                  {addresses.length ? addresses.map((address) => (
                    <Paper key={address.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                        <Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                            <Typography sx={{ fontWeight: 800 }}>{address.label || "Address"}</Typography>
                            {address.isDefault ? <Chip size="small" color="success" label="Default" /> : null}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>
                            {address.recipient}{address.mobile ? ` | ${address.mobile}` : ""}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{formatSavedAddress(address)}</Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          {!address.isDefault ? <Button variant="outlined" onClick={() => handleSetDefaultAddress(address.id)}>Make Default</Button> : null}
                          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => openAddressDialog(address)}>Edit</Button>
                          <Button color="error" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => deleteAddress(address.id)}>Delete</Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  )) : (
                    <Alert severity="info">No saved addresses yet. Add one to use multiple delivery locations.</Alert>
                  )}
                </Stack>
              </SectionShell>

              <Paper elevation={0} sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
                  <Stack direction={{ xs: "column", xl: "row" }} spacing={3}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Profile Snapshot</Typography>
                      <Typography variant="body2" color="text.secondary">Name</Typography>
                      <Typography sx={{ fontWeight: 700, mb: 1.2 }}>{form.name || "Not available"}</Typography>
                      <Typography variant="body2" color="text.secondary">Email</Typography>
                      <Typography sx={{ fontWeight: 700, mb: 1.2 }}>{form.email || "Not available"}</Typography>
                      <Typography variant="body2" color="text.secondary">Phone</Typography>
                      <Typography sx={{ fontWeight: 700, mb: 1.2 }}>{form.phone || "Not available"}</Typography>
                      <Typography variant="body2" color="text.secondary">Address</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{accountAddress || "Not available"}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Benefits and Activity</Typography>
                      <Stack spacing={1.4}>
                        <Stack direction="row" spacing={1.4} alignItems="flex-start">
                          <LocalOfferOutlinedIcon sx={{ color: "#2874f0", mt: 0.2 }} />
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>Faster checkout</Typography>
                            <Typography variant="body2" color="text.secondary">Saved profile details and addresses reduce checkout effort.</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1.4} alignItems="flex-start">
                          <EmailOutlinedIcon sx={{ color: "#2874f0", mt: 0.2 }} />
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>Order communication</Typography>
                            <Typography variant="body2" color="text.secondary">Your email and phone keep delivery and order updates accurate.</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1.4} alignItems="flex-start">
                          <HomeWorkOutlinedIcon sx={{ color: "#2874f0", mt: 0.2 }} />
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>Multiple addresses</Typography>
                            <Typography variant="body2" color="text.secondary">Keep home, work, and alternate delivery addresses ready.</Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider", p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.2 }}>Login & Contact Info</Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Chip icon={<EmailOutlinedIcon />} label={form.email || "No email"} sx={{ justifyContent: "flex-start", px: 1 }} />
                  <Chip icon={<LocalPhoneOutlinedIcon />} label={form.phone || "No phone"} sx={{ justifyContent: "flex-start", px: 1 }} />
                  <Chip icon={<PlaceOutlinedIcon />} label={`${addresses.length} saved address${addresses.length === 1 ? "" : "es"}`} sx={{ justifyContent: "flex-start", px: 1 }} />
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Stack>

        <Dialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{addressForm.id ? "Edit Address" : "Add Address"}</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField label="Label" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} fullWidth />
              <TextField label="Recipient" value={addressForm.recipient} onChange={(event) => setAddressForm((current) => ({ ...current, recipient: event.target.value }))} fullWidth />
              <TextField label="Mobile" value={addressForm.mobile} onChange={(event) => setAddressForm((current) => ({ ...current, mobile: event.target.value }))} fullWidth />
              <TextField label="Street" value={addressForm.street} onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))} fullWidth />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField label="City" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} fullWidth />
                <TextField label="State" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} fullWidth />
              </Stack>
              <TextField label="Pincode" value={addressForm.pincode} onChange={(event) => setAddressForm((current) => ({ ...current, pincode: event.target.value }))} fullWidth />
              <Button variant={addressForm.isDefault ? "contained" : "outlined"} onClick={() => setAddressForm((current) => ({ ...current, isDefault: !current.isDefault }))}>
                {addressForm.isDefault ? "Default Address" : "Mark as Default"}
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddressDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveAddress} disabled={addressSaving}>
              {addressSaving ? "Saving..." : addressForm.id ? "Update Address" : "Save Address"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
