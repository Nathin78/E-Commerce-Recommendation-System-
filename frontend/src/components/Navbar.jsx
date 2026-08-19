import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import SmartphoneOutlinedIcon from "@mui/icons-material/SmartphoneOutlined";
import LaptopChromebookOutlinedIcon from "@mui/icons-material/LaptopChromebookOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SportsBasketballOutlinedIcon from "@mui/icons-material/SportsBasketballOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ChairOutlinedIcon from "@mui/icons-material/ChairOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useColorMode } from "../context/ThemeModeContext";
import api from "../services/api";
import ColorIconBadge from "./ColorIconBadge";

export default function Navbar({ lowStockMessage }) {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useColorMode();
  const theme = useTheme();
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(() => localStorage.getItem("deliveryLocation") || "");
  const [locationInput, setLocationInput] = useState(() => localStorage.getItem("deliveryLocation") || "");
  const [locationError, setLocationError] = useState("");
  const [serverHealth, setServerHealth] = useState({ ok: false, checked: false });
  const currentCategory = new URLSearchParams(location.search).get("category") || "";
  const shellBg = theme.palette.background.default;
  const shellBorder = theme.palette.divider;
  const brandBg = theme.palette.text.primary;
  const brandText = theme.palette.background.default;
  const accent = theme.palette.text.primary;
  const secondaryAccent = theme.palette.secondary.main;
  const infoAccent = theme.palette.info.main;
  const successAccent = theme.palette.success.main;
  const mainText = theme.palette.text.primary;
  const mutedText = theme.palette.text.secondary;
  const badgeBg = theme.palette.background.paper;
  const actionButtons = {
    logout: { icon: <PersonOutlineIcon />, palette: ["#ef4444", "#f97316"], shadow: "0 8px 18px rgba(239,68,68,0.18)" },
    mode: {
      icon: mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />,
      palette: mode === "dark" ? ["#f59e0b", "#fb7185"] : ["#2563eb", "#06b6d4"],
      shadow: "0 8px 18px rgba(59,130,246,0.18)"
    },
    profile: { icon: <PersonOutlineIcon />, palette: ["#2563eb", "#7c3aed"], shadow: "0 8px 18px rgba(99,102,241,0.18)" },
    wishlist: { icon: <FavoriteBorderOutlinedIcon />, palette: ["#ec4899", "#f43f5e"], shadow: "0 8px 18px rgba(236,72,153,0.18)" },
    orders: { icon: <Inventory2OutlinedIcon />, palette: ["#14b8a6", "#10b981"], shadow: "0 8px 18px rgba(16,185,129,0.18)" },
    cart: { icon: <ShoppingCartOutlinedIcon />, palette: ["#f97316", "#eab308"], shadow: "0 8px 18px rgba(249,115,22,0.18)" }
  };

  const navItems = useMemo(
    () => [
      { label: "For You", icon: <HomeOutlinedIcon fontSize="small" />, category: "", palette: ["#2563eb", "#7c3aed"] },
      { label: "Fashion", icon: <CheckroomOutlinedIcon fontSize="small" />, category: "Fashion", palette: ["#ec4899", "#f97316"] },
      { label: "Mobiles", icon: <SmartphoneOutlinedIcon fontSize="small" />, category: "Mobiles", palette: ["#06b6d4", "#2563eb"] },
      { label: "Electronics", icon: <LaptopChromebookOutlinedIcon fontSize="small" />, category: "Electronics", palette: ["#4f46e5", "#0ea5e9"] },
      { label: "Home", icon: <HomeOutlinedIcon fontSize="small" />, category: "Home", palette: ["#10b981", "#14b8a6"] },
      { label: "Sports", icon: <SportsBasketballOutlinedIcon fontSize="small" />, category: "Sports", palette: ["#f97316", "#ef4444"] },
      { label: "Books", icon: <MenuBookOutlinedIcon fontSize="small" />, category: "Books", palette: ["#8b5cf6", "#ec4899"] },
      { label: "Furniture", icon: <ChairOutlinedIcon fontSize="small" />, category: "Furniture", palette: ["#f59e0b", "#84cc16"] }
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    const checkServer = () => {
      api
        .get("/health")
        .then(({ data }) => {
          if (!cancelled) {
            setServerHealth({ ok: Boolean(data?.ok), checked: true });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setServerHealth({ ok: false, checked: true });
          }
        });
    };

    checkServer();
    const intervalId = setInterval(checkServer, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const openLocationDialog = () => {
    setLocationInput(deliveryLocation);
    setLocationError("");
    setLocationDialogOpen(true);
  };

  const closeLocationDialog = () => setLocationDialogOpen(false);

  const useCurrentLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Current location is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        setLocationInput(currentLocation);
        setDeliveryLocation(currentLocation);
        localStorage.setItem("deliveryLocation", currentLocation);
        setLocationDialogOpen(false);
      },
      () => {
        setLocationError("Unable to access current location. Please allow location permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const saveLocation = () => {
    const nextLocation = locationInput.trim();
    setDeliveryLocation(nextLocation);
    localStorage.setItem("deliveryLocation", nextLocation);
    setLocationDialogOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const serverStatusChip = serverHealth.checked ? (
    <Chip
      size="small"
      icon={serverHealth.ok ? <CloudDoneOutlinedIcon /> : <CloudOffOutlinedIcon />}
      label={serverHealth.ok ? "Server online" : "Server offline"}
      color={serverHealth.ok ? "success" : "warning"}
      variant={serverHealth.ok ? "filled" : "outlined"}
    />
  ) : null;

  if (isAdmin) {
    return (
      <>
        <Box
          sx={{
            borderTop: `5px solid ${secondaryAccent}`,
            bgcolor: shellBg,
            borderBottom: `1px solid ${shellBorder}`,
            backgroundImage: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
          }}
        >
          <Container maxWidth="lg" sx={{ py: 1.3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.2}>
              <Paper
                component={Link}
                to="/"
                elevation={0}
                sx={{
                  px: { xs: 1.4, md: 2 },
                  py: 1,
                  borderRadius: 2,
                  bgcolor: brandBg,
                  fontWeight: 900,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Typography sx={{ fontWeight: 900, color: brandText, fontSize: { xs: 16, md: 18 } }}>Sellora</Typography>
              </Paper>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {serverStatusChip}
                <Button
                  onClick={() => navigate("/admin", { state: { activeTab: 1, openProductDialog: true } })}
                  variant="outlined"
                  color="secondary"
                  sx={{ fontWeight: 800, px: { xs: 1.2, md: 2 } }}
                >
                  Add Product
                </Button>
                <Button
                  component={Link}
                  to="/admin"
                  variant="outlined"
                  color="secondary"
                  sx={{ fontWeight: 800, px: { xs: 1.2, md: 2 } }}
                >
                  Admin Dashboard
                </Button>
                <Button
                  onClick={handleLogout}
                  startIcon={<ColorIconBadge icon={actionButtons.logout.icon} palette={actionButtons.logout.palette} size={28} iconSize={15} shadow={actionButtons.logout.shadow} />}
                  sx={{ color: mainText, px: { xs: 1, md: 1.5 } }}
                >
                  Logout
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
        {lowStockMessage ? <Alert severity="warning" sx={{ borderRadius: 0 }}>{lowStockMessage}</Alert> : null}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          borderTop: `5px solid ${secondaryAccent}`,
          bgcolor: shellBg,
          borderBottom: `1px solid ${shellBorder}`,
          backgroundImage: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.3 }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.2}>
            <Stack
              direction="row"
              spacing={1.3}
              alignItems="center"
              sx={{ width: "100%", justifyContent: "flex-start", flexWrap: "nowrap" }}
            >
              <Paper
                component={Link}
                to="/"
                elevation={0}
                sx={{
                  px: { xs: 1.4, md: 2 },
                  py: 1,
                  borderRadius: 2,
                  bgcolor: brandBg,
                  fontWeight: 900,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Typography sx={{ fontWeight: 900, color: brandText, fontSize: { xs: 16, md: 18 } }}>Sellora</Typography>
              </Paper>
              {user ? (
                <Paper
                  elevation={0}
                  sx={{
                    px: { xs: 1.2, md: 1.6 },
                    py: 0.85,
                    borderRadius: 2,
                    bgcolor: badgeBg,
                    border: `1px solid ${shellBorder}`
                  }}
                >
                  <Typography
                    sx={{
                      color: accent,
                      fontWeight: 800,
                      fontSize: { xs: 12, md: 13 },
                      whiteSpace: "nowrap",
                      maxWidth: { xs: 120, md: 180 },
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {user.name}
                  </Typography>
                </Paper>
              ) : null}
            </Stack>
            <Stack
              direction="row"
              spacing={0.6}
              alignItems="center"
              flexWrap="wrap"
              sx={{ display: "flex", mt: { xs: 0.5, md: 0 }, width: "100%", justifyContent: { xs: "flex-start", md: "flex-end" } }}
            >
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: successAccent }} />
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 12, md: 14 }, color: mutedText }}>
                {deliveryLocation ? `Deliver to ${deliveryLocation}` : "Location not set"}
              </Typography>
              <Button size="small" color="secondary" sx={{ fontWeight: 700, px: { xs: 0.5, md: 1 }, color: mainText }} onClick={openLocationDialog}>
                {deliveryLocation ? "Change address" : "Choose address"}
              </Button>
              {serverStatusChip}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} sx={{ mt: 1.2 }}>
            <Box component="form" onSubmit={submitSearch} sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search curated products and brands"
                sx={{
                  bgcolor: theme.palette.background.paper,
                  borderRadius: 2,
                  "& input": { color: mainText },
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: shellBorder }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: infoAccent }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" size="small" color="primary">
                        <SearchIcon sx={{ color: secondaryAccent }} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Stack direction="row" spacing={0.2} alignItems="center" flexWrap="wrap" sx={{ justifyContent: { xs: "space-between", md: "flex-start" } }}>
              {!user ? (
                <>
                  <Button
                    component={Link}
                    to="/login"
                    startIcon={<PersonOutlineIcon />}
                    sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}
                  >
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/register"
                    sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}
                  >
                    Register
                  </Button>
                </>
              ) : (
                <Button onClick={handleLogout} startIcon={<ColorIconBadge icon={actionButtons.logout.icon} palette={actionButtons.logout.palette} size={28} iconSize={15} shadow={actionButtons.logout.shadow} />} sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}>
                  Logout
                </Button>
              )}
              <Button
                onClick={toggleMode}
                startIcon={<ColorIconBadge icon={actionButtons.mode.icon} palette={actionButtons.mode.palette} size={28} iconSize={15} shadow={actionButtons.mode.shadow} />}
                sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}
              >
                {mode === "dark" ? "Light" : "Dark"}
              </Button>
              {user ? (
                <Button component={Link} to="/profile" startIcon={<ColorIconBadge icon={actionButtons.profile.icon} palette={actionButtons.profile.palette} size={28} iconSize={15} shadow={actionButtons.profile.shadow} />} sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}>
                  Profile
                </Button>
              ) : null}
              <Button component={Link} to="/wishlist" startIcon={<ColorIconBadge icon={actionButtons.wishlist.icon} palette={actionButtons.wishlist.palette} size={28} iconSize={15} shadow={actionButtons.wishlist.shadow} />} sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}>Wishlist</Button>
              <Button component={Link} to="/orders" startIcon={<ColorIconBadge icon={actionButtons.orders.icon} palette={actionButtons.orders.palette} size={28} iconSize={15} shadow={actionButtons.orders.shadow} />} sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}>Orders</Button>
              <Button component={Link} to="/cart" startIcon={<ColorIconBadge icon={actionButtons.cart.icon} palette={actionButtons.cart.palette} size={28} iconSize={15} shadow={actionButtons.cart.shadow} />} sx={{ color: mainText, minWidth: { xs: 0, md: "auto" }, px: { xs: 0.8, md: 1.5 } }}>Cart</Button>
            </Stack>
          </Stack>

          <Dialog open={locationDialogOpen} onClose={closeLocationDialog} fullWidth maxWidth="sm">
            <DialogTitle>Choose delivery address</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              {locationError ? <Alert severity="warning" sx={{ mb: 2 }}>{locationError}</Alert> : null}
              <TextField
                autoFocus
                fullWidth
                label="Delivery location"
                placeholder="Enter city, area, or full address"
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                sx={{ mt: 1 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={useCurrentLocation}>Use current location</Button>
              <Button onClick={closeLocationDialog}>Cancel</Button>
              <Button variant="contained" onClick={saveLocation}>Save</Button>
            </DialogActions>
          </Dialog>

          <Stack direction="row" spacing={1.2} sx={{ mt: 1.3, overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
            {navItems.map((item) => (
              <Box
                key={item.label}
                onClick={() => navigate(item.category ? `/shop?category=${encodeURIComponent(item.category)}` : "/shop")}
                sx={{
                  minWidth: { xs: 78, sm: 96 },
                  textAlign: "center",
                  cursor: "pointer",
                  borderBottom:
                    (item.category === "" && !currentCategory) || currentCategory === item.category
                      ? `3px solid ${accent}`
                      : "3px solid transparent",
                  pb: 0.7
                }}
              >
                <Box sx={{ display: "grid", placeItems: "center", mb: 0.55 }}>
                  <ColorIconBadge
                    icon={item.icon}
                    palette={item.palette}
                    size={38}
                    iconSize={18}
                    shadow={theme.palette.mode === "dark" ? "0 10px 20px rgba(15,23,42,0.42)" : "0 10px 22px rgba(59,130,246,0.16)"}
                  />
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: { xs: 12, sm: 13 }, color: mainText }}>{item.label}</Typography>
              </Box>
            ))}
            {user?.role === "admin" ? (
              <Button component={Link} to="/admin" size="small" variant="outlined" color="secondary">Admin</Button>
            ) : null}
          </Stack>
        </Container>
      </Box>
      {lowStockMessage ? <Alert severity="warning" sx={{ borderRadius: 0 }}>{lowStockMessage}</Alert> : null}
    </>
  );
}
