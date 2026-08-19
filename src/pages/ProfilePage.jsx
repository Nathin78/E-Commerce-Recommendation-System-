import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ColorIconBadge from "../components/ColorIconBadge";

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

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InfoRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="flex-start">
      <ColorIconBadge icon={icon} size={34} iconSize={16} palette={["#2563eb", "#14b8a6"]} shadow="0 8px 18px rgba(37,99,235,0.14)" />
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{value || "Not added yet"}</Typography>
      </Box>
    </Stack>
  );
}

function SectionCard({ icon, title, helper, children }) {
  return (
    <Paper sx={{ p: { xs: 1.8, md: 2.2 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1.5 }}>
        <ColorIconBadge icon={icon} palette={["#7c3aed", "#ec4899"]} size={40} iconSize={18} shadow="0 10px 22px rgba(124,58,237,0.18)" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
          {helper ? <Typography variant="body2" color="text.secondary">{helper}</Typography> : null}
        </Box>
      </Stack>
      {children}
    </Paper>
  );
}

export default function ProfilePage() {
  const theme = useTheme();
  const { user, updateAuthUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) {
      setError("");
    }
    if (message) {
      setMessage("");
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/users/profile"),
      api.get("/users/addresses"),
      api.get("/users/wishlist"),
      api.get("/orders")
    ])
      .then(([profileRes, addressesRes, wishlistRes, ordersRes]) => {
        if (cancelled) return;
        const nextUser = profileRes.data.user;
        const loadedAddresses = addressesRes.data.addresses || [];
        const preferredAddress = getDefaultAddress(loadedAddresses, addressesRes.data.defaultAddressId || nextUser.defaultAddressId || null);

        setProfile(nextUser);
        setAddresses(loadedAddresses);
        setWishlistCount((wishlistRes.data.wishlist || []).length);
        setOrdersCount((ordersRes.data.orders || []).length);
        setForm(buildProfileForm(nextUser, preferredAddress));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
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

  return (
    <Container sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Paper
        sx={{
          mb: 2.2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          background: theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(20,26,46,0.98) 48%, rgba(16,41,56,0.96))"
            : "linear-gradient(135deg, #f6fbff, #ffffff 55%, #edf9f3)"
        }}
      >
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.8} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Avatar
              sx={{
                width: 84,
                height: 84,
                bgcolor: theme.palette.mode === "dark" ? "info.dark" : "info.main",
                fontSize: 30,
                fontWeight: 900,
                boxShadow: theme.palette.mode === "dark"
                  ? "0 14px 28px rgba(2,132,199,0.22)"
                  : "0 18px 30px rgba(37,99,235,0.18)"
              }}
            >
              {getInitials(profile?.name) || <PersonRoundedIcon />}
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: 30, sm: 42 } }}>
                Edit Profile
              </Typography>
              <Typography sx={{ mt: 0.8, color: "text.secondary", maxWidth: 700, fontSize: { xs: 16, sm: 18 } }}>
                Manage your personal details, delivery contact, and default address from one cleaner account settings view.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            <Chip icon={<Inventory2OutlinedIcon />} label={`${ordersCount} orders`} />
            <Chip icon={<FavoriteBorderOutlinedIcon />} label={`${wishlistCount} wishlist`} />
            <Chip icon={<VerifiedUserOutlinedIcon />} color="success" label={user?.role === "admin" ? "Admin account" : "Customer account"} />
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Box sx={{ width: { xs: "100%", xl: 340 }, flexShrink: 0 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2.2, borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Profile Snapshot</Typography>
              <Stack spacing={1.5}>
                <InfoRow icon={<PersonRoundedIcon fontSize="small" />} label="Full Name" value={form.name} />
                <InfoRow icon={<EmailOutlinedIcon fontSize="small" />} label="Email Address" value={form.email} />
                <InfoRow icon={<LocalPhoneOutlinedIcon fontSize="small" />} label="Phone Number" value={form.phone} />
                <InfoRow icon={<PlaceOutlinedIcon fontSize="small" />} label="Residential Address" value={accountAddress} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.2, borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>Default Delivery Address</Typography>
              {defaultAddress ? (
                <Stack spacing={0.8}>
                  <Chip size="small" color="success" label={defaultAddress.label || "Default"} sx={{ alignSelf: "flex-start" }} />
                  <Typography sx={{ fontWeight: 800 }}>{defaultAddress.recipient}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatSavedAddress(defaultAddress)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {defaultAddress.mobile || "Mobile not added"}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No saved address yet. Add one from checkout or address management to see it here.
                </Typography>
              )}
            </Paper>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, width: "100%" }}>
          <Stack spacing={2}>
            <SectionCard
              icon={<PersonRoundedIcon fontSize="small" />}
              title="Personal Information"
              helper="These details are shown across your account and orders."
            >
              <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <TextField
                    label="Full Name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Phone Number"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  fullWidth
                />
              </Stack>
            </SectionCard>

            <SectionCard
              icon={<HomeWorkOutlinedIcon fontSize="small" />}
              title="Residential Address"
              helper="Use your main address here. We also show your saved default delivery address beside it."
            >
              <Stack spacing={1.2}>
                <TextField
                  label="Residential Address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  multiline
                  minRows={5}
                  placeholder={formatSavedAddress(defaultAddress) || "Enter your home or billing address"}
                  fullWidth
                />
                {defaultAddress ? (
                  <Box
                    sx={{
                      p: 1.3,
                      borderRadius: 2.5,
                      bgcolor: "action.hover",
                      border: `1px dashed ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                      Suggested from saved delivery address
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatSavedAddress(defaultAddress)}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </SectionCard>

            <Paper sx={{ p: { xs: 1.8, md: 2.2 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Save Profile Changes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Update your account details without changing your login session.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button variant="outlined" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ my: 1.7 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<Inventory2OutlinedIcon />} label={`Orders placed: ${ordersCount}`} />
                <Chip icon={<FavoriteBorderOutlinedIcon />} label={`Wishlist items: ${wishlistCount}`} />
                <Chip icon={<PlaceOutlinedIcon />} label={`${addresses.length} saved address${addresses.length === 1 ? "" : "es"}`} />
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
