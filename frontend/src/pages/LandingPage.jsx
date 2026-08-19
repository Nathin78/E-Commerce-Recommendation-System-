import { Box, Button, Chip, Container, Paper, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Lightning Flash Deals",
    desc: "Live countdowns, low-stock alerts, and real-time price drops.",
    icon: <BoltOutlinedIcon color="primary" />
  },
  {
    title: "Fast Delivery Flow",
    desc: "Add to cart, checkout quickly, and track orders with live updates.",
    icon: <LocalShippingOutlinedIcon color="primary" />
  },
  {
    title: "Safe Login & Checkout",
    desc: "JWT authentication with protected routes for secure shopping.",
    icon: <SecurityOutlinedIcon color="primary" />
  }
];

export default function LandingPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const heroText = theme.palette.text.primary;
  const heroMuted = isDark ? "rgba(248,250,252,0.78)" : theme.palette.text.secondary;
  const heroSurface = isDark ? theme.palette.background.paper : "#f4fbf8";
  const heroBorder = theme.palette.divider;
  const featureBg = theme.palette.background.paper;
  return (
    <Box sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: { xs: 2, sm: 3.5, md: 5 },
            borderRadius: 4,
            border: `1px solid ${heroBorder}`,
            bgcolor: heroSurface,
            color: heroText,
            backgroundImage: isDark
              ? "radial-gradient(circle at 15% 10%, rgba(59,130,246,0.18) 0, rgba(59,130,246,0.18) 16%, transparent 17%), radial-gradient(circle at 88% 18%, rgba(249,115,22,0.14) 0, rgba(249,115,22,0.14) 13%, transparent 14%), linear-gradient(145deg, rgba(15,23,42,0.98), rgba(20,26,46,0.98))"
              : "radial-gradient(circle at 15% 10%, #d5f5ec 0, #d5f5ec 18%, transparent 19%), radial-gradient(circle at 90% 20%, #fdeccf 0, #fdeccf 14%, transparent 15%)"
          }}
        >
          <Chip
            label="Featured Marketplace"
            sx={{
              fontWeight: 700,
              bgcolor: isDark ? theme.palette.secondary.main : theme.palette.secondary.main,
              color: isDark ? theme.palette.secondary.contrastText : theme.palette.secondary.contrastText
            }}
          />
          <Typography sx={{ mt: 2, fontSize: { xs: 32, sm: 46, md: 58 }, fontWeight: 900, lineHeight: 1.06, color: heroText }}>
            Discover products, deals, and live stock updates
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 680, color: heroMuted, fontSize: { xs: 15, sm: 17 } }}>
            Welcome to Sellora, a modern marketplace with curated products, flash sales, live stock sync, and personalized recommendations.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} sx={{ mt: 3 }}>
            <Button component={Link} to="/shop" variant="contained" size="large" color="secondary">
              Browse Catalog
            </Button>
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              size="large"
              sx={{
                color: theme.palette.text.primary,
                borderColor: isDark ? "rgba(248,250,252,0.48)" : heroBorder,
                bgcolor: isDark ? "rgba(248,250,252,0.05)" : "transparent",
                "&:hover": {
                  borderColor: theme.palette.secondary.main,
                  bgcolor: isDark ? "rgba(248,250,252,0.08)" : "rgba(249,115,22,0.08)"
                }
              }}
            >
              Login
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              size="large"
              sx={{
                color: theme.palette.text.primary,
                borderColor: isDark ? "rgba(248,250,252,0.48)" : heroBorder,
                bgcolor: isDark ? "rgba(248,250,252,0.05)" : "transparent",
                "&:hover": {
                  borderColor: theme.palette.secondary.main,
                  bgcolor: isDark ? "rgba(248,250,252,0.08)" : "rgba(249,115,22,0.08)"
                }
              }}
            >
              Register
            </Button>
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2.5 }}>
          {highlights.map((item) => (
            <Paper
              key={item.title}
              sx={{
                p: 2.2,
                borderRadius: 3,
                flex: 1,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: featureBg
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box sx={{ color: theme.palette.mode === "dark" ? theme.palette.secondary.main : theme.palette.primary.main }}>{item.icon}</Box>
                <Typography sx={{ fontWeight: 800, color: theme.palette.text.primary }}>{item.title}</Typography>
              </Stack>
              <Typography sx={{ mt: 1, color: theme.palette.text.secondary }}>{item.desc}</Typography>
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
