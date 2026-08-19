import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register" }
];

const supportLinks = [
  { label: "Wishlist", to: "/wishlist" },
  { label: "Orders", to: "/orders" },
  { label: "Cart", to: "/cart" }
];

export default function Footer() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        backgroundImage: isDark
          ? "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))"
          : "radial-gradient(circle at top left, rgba(37,99,235,0.1), transparent 28%), radial-gradient(circle at top right, rgba(249,115,22,0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,1), rgba(245,248,255,1))"
      }}
    >
      <Container sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
            <Box sx={{ maxWidth: 360 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                Sellora
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time flash-sale shopping with live stock updates, personalized recommendations, and a fast checkout experience.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={5}>
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1 }}>
                  Explore
                </Typography>
                <Stack sx={{ mt: 1 }} spacing={0.8}>
                  {quickLinks.map((item) => (
                    <Link
                      key={item.label}
                      component={RouterLink}
                      to={item.to}
                      underline="hover"
                      color="text.secondary"
                      sx={{ width: "fit-content", fontWeight: 500 }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1 }}>
                  Account
                </Typography>
                <Stack sx={{ mt: 1 }} spacing={0.8}>
                  {supportLinks.map((item) => (
                    <Link
                      key={item.label}
                      component={RouterLink}
                      to={item.to}
                      underline="hover"
                      color="text.secondary"
                      sx={{ width: "fit-content", fontWeight: 500 }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(148,163,184,0.08)" : "rgba(37,99,235,0.06)",
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              Designed for quick navigation, clean branding, and a more polished marketplace feel.
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
