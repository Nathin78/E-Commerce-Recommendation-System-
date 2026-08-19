import { Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";
import FlashCountdown from "./FlashCountdown";
import { inr } from "../utils/currency";
import ProductImage from "./ProductImage";

export default function ProductCard({ product, onAdd, onWishlist, serverNow, wishlistLabel = "Wishlist" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: isDark ? "0 14px 28px rgba(0,0,0,0.35)" : "0 14px 28px rgba(15,23,42,0.1)"
        }
      }}
    >
      <Box component={Link} to={`/products/${product.id}`} sx={{ display: "block", textDecoration: "none" }}>
        <ProductImage
          src={product.image}
          alt={product.name}
          sx={{
            width: "100%",
            height: { xs: 170, sm: 190 },
            objectFit: "cover",
            cursor: "pointer",
            bgcolor: theme.palette.action.hover
          }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: 16, sm: 18 },
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {product.name}
          </Typography>
          {product.flashSale ? <Chip color="error" label="FLASH" size="small" /> : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{product.brand || "Generic"}</Typography>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.7 }}>
          <Chip
            label={`${product.ratingSummary?.average || "0.0"} ★`}
            size="small"
            color={product.ratingSummary?.count ? "success" : "default"}
            variant={product.ratingSummary?.count ? "filled" : "outlined"}
          />
          <Typography variant="caption" color="text.secondary">
            {product.ratingSummary?.count || 0} review{product.ratingSummary?.count === 1 ? "" : "s"}
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
        >
          {product.description}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
          {inr(product.flashSale ? product.flashSale.discountPrice : product.price)}
          {product.flashSale ? (
            <Typography component="span" sx={{ textDecoration: "line-through", ml: 1, color: "text.secondary" }}>
              {inr(product.price)}
            </Typography>
          ) : null}
        </Typography>
        {product.flashSale ? <FlashCountdown sale={product.flashSale} serverNow={serverNow} /> : null}
      </CardContent>
      <CardActions sx={{ px: { xs: 1.5, sm: 2 }, pb: { xs: 1.5, sm: 2 }, pt: 0 }}>
        <Stack spacing={0.8} sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => onAdd(product.id, product.sizes?.[0] || "M")}
              size="small"
              variant="outlined"
              fullWidth
              sx={{ whiteSpace: "nowrap" }}
            >
              Add to Cart
            </Button>
            <Button
              component={Link}
              to={`/products/${product.id}`}
              size="small"
              variant="contained"
              color="warning"
              fullWidth
              sx={{ whiteSpace: "nowrap" }}
            >
              Buy Now
            </Button>
          </Stack>
          <Button onClick={() => onWishlist(product.id)} size="small" sx={{ alignSelf: "flex-start", color: theme.palette.text.secondary }}>
            {wishlistLabel}
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
}

