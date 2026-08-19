import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const copyByMode = {
  login: {
    badge: "Welcome back",
    title: "Sign in to keep shopping",
    subtitle: "Pick up where you left off, track flash deals, and keep your wishlist in sync.",
    submitLabel: "Login",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchTo: "/register"
  },
  register: {
    badge: "Join FlashKart",
    title: "Create your account",
    subtitle: "Get instant access to live deals, fast checkout, and real-time order updates.",
    submitLabel: "Register",
    switchPrompt: "Already have an account?",
    switchLabel: "Login instead",
    switchTo: "/login"
  }
};

const highlights = [
  {
    icon: <FlashOnOutlinedIcon />,
    title: "Live flash sales",
    description: "See countdowns and stock changes as they happen."
  },
  {
    icon: <LocalShippingOutlinedIcon />,
    title: "Fast delivery flow",
    description: "Move from sign-in to checkout without friction."
  },
  {
    icon: <SecurityOutlinedIcon />,
    title: "Secure access",
    description: "JWT-backed login with protected shopping routes."
  }
];

export default function AuthScreen({ mode }) {
  const theme = useTheme();
  const copy = copyByMode[mode] || copyByMode.login;
  const isRegister = mode === "register";
  const { login: setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || "";
  const initialMessage = location.state?.message || "";
  const [form, setForm] = useState({ name: "", email: initialEmail, address: "", password: "" });
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setForm((current) => ({ ...current, email: initialEmail }));
    }
  }, [initialEmail]);

  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [initialMessage]);

  const formFields = useMemo(
    () =>
      [
        isRegister
          ? { key: "name", label: "Full name", type: "text", autoComplete: "name" }
          : null,
        isRegister
          ? { key: "address", label: "Residential address", type: "text", autoComplete: "street-address" }
          : null,
        { key: "email", label: "Email address", type: "email", autoComplete: "email" },
        {
          key: "password",
          label: "Password",
          type: "password",
          autoComplete: isRegister ? "new-password" : "current-password"
        }
      ].filter(Boolean),
    [isRegister]
  );

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isRegister) {
        await api.post("/auth/register", form);
        navigate("/login", {
          replace: true,
          state: {
            message: "Registration successful. Please log in with your new account.",
            email: form.email
          }
        });
        return;
      }

      const { data } = await api.post("/auth/login", {
        email: form.email,
        password: form.password
      });
      setSession(data.token, data.user);
      navigate(data.user?.role === "admin" ? "/admin" : "/shop", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: { xs: 2.5, md: 6 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          gap: { xs: 2.5, md: 3 },
          alignItems: "stretch"
        }}
      >
        <Card
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(140deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 60%, rgba(2,132,199,0.82) 100%)"
                : "linear-gradient(140deg, rgba(15,118,110,0.95) 0%, rgba(8,67,70,0.95) 62%, rgba(217,119,6,0.92) 100%)",
            color: theme.palette.mode === "dark" ? theme.palette.contrast.paper : "#f8fffd"
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.18) 0, transparent 26%), radial-gradient(circle at 88% 18%, rgba(255,224,184,0.22) 0, transparent 18%), radial-gradient(circle at 70% 78%, rgba(255,255,255,0.08) 0, transparent 22%)"
            }}
          />
          <CardContent sx={{ position: "relative", zIndex: 1, p: { xs: 2.5, sm: 4.5 }, height: "100%" }}>
            <Stack spacing={2.2} sx={{ height: "100%" }}>
              <Chip
                label={copy.badge}
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: theme.palette.mode === "dark" ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.16)",
                  color: theme.palette.mode === "dark" ? theme.palette.contrast.paper : "#fff",
                  fontWeight: 700
                }}
              />
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05, fontSize: { xs: 32, sm: 46, md: 58 } }}>
                  {copy.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 1.5,
                    maxWidth: 520,
                    color: theme.palette.mode === "dark" ? "rgba(248,250,252,0.82)" : "rgba(248,255,253,0.88)",
                    fontSize: { xs: 15.5, sm: 17 }
                  }}
                >
                  {copy.subtitle}
                </Typography>
              </Box>

              <Stack spacing={1.5} sx={{ mt: { xs: 0.5, md: "auto" } }}>
                {highlights.map((item) => (
                  <Box
                    key={item.title}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      alignItems: "flex-start",
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: theme.palette.mode === "dark" ? "rgba(148,163,184,0.09)" : "rgba(255,255,255,0.08)",
                      border: theme.palette.mode === "dark" ? "1px solid rgba(148,163,184,0.16)" : "1px solid rgba(255,255,255,0.12)"
                    }}
                  >
                    <Box sx={{ color: theme.palette.mode === "dark" ? theme.palette.secondary.main : "#fff7ed", mt: 0.25 }}>{item.icon}</Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: theme.palette.mode === "dark" ? theme.palette.contrast.paper : "#fff" }}>{item.title}</Typography>
                      <Typography sx={{ color: theme.palette.mode === "dark" ? "rgba(248,250,252,0.78)" : "rgba(248,255,253,0.8)", fontSize: 14 }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4.5 } }}>
            <Stack spacing={2.2} component="form" onSubmit={submit}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {copy.submitLabel}
                </Typography>
                <Typography sx={{ mt: 0.8, color: "text.secondary" }}>
                  Enter your details below to continue.
                </Typography>
              </Box>

              {message ? <Alert severity="success">{message}</Alert> : null}
              {error ? <Alert severity="error">{error}</Alert> : null}

              <Stack spacing={2}>
                {formFields.map((field) => (
                  <TextField
                    key={field.key}
                    fullWidth
                    required
                    label={field.label}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    value={form[field.key]}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                ))}
              </Stack>

              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
                {loading ? "Please wait..." : copy.submitLabel}
              </Button>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === "dark" ? theme.palette.action.hover : "#f8fbfa",
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography sx={{ fontWeight: 800, mb: 0.8 }}>Demo accounts</Typography>
                <Typography variant="body2" color="text.secondary">
                  Admin account: admin@flashsale.com / admin123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer account: user@flashsale.com / user123
                </Typography>
              </Box>

              <Divider />

              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  {copy.switchPrompt}
                </Typography>
                <Button component={RouterLink} to={copy.switchTo} variant="outlined" color="primary">
                  {copy.switchLabel}
                </Button>
              </Stack>

              {isRegister ? (
                <Typography variant="body2" color="text.secondary">
                  By creating an account, you can track orders, save favorites, and get access to flash-sale alerts.
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
