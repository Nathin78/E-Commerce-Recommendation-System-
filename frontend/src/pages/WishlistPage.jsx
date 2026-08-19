import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container, Paper, Snackbar, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Grid from "@mui/material/Grid2";
import ProductCard from "../components/ProductCard";
import api from "../services/api";
import socket from "../services/socket";

export default function WishlistPage({ serverNow }) {
  const theme = useTheme();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users/wishlist");
      setWishlist(data.wishlist || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    const refreshWishlist = () => loadWishlist();
    const onFlashTick = (ticks) => {
      setWishlist((prev) =>
        prev.map((product) => {
          const tick = ticks.find((entry) => entry.productId === product.id);
          if (!tick || !product.flashSale) return product;
          if (!tick.isActive) return { ...product, flashSale: null };
          return {
            ...product,
            flashSale: {
              ...product.flashSale,
              remaining: tick.remaining
            }
          };
        })
      );
    };

    socket.on("flashSale:created", refreshWishlist);
    socket.on("flashSale:started", refreshWishlist);
    socket.on("flashSale:expired", refreshWishlist);
    socket.on("flashSale:tick", onFlashTick);

    return () => {
      socket.off("flashSale:created", refreshWishlist);
      socket.off("flashSale:started", refreshWishlist);
      socket.off("flashSale:expired", refreshWishlist);
      socket.off("flashSale:tick", onFlashTick);
    };
  }, []);

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/users/wishlist/${productId}`);
      setWishlist((prev) => prev.filter((item) => item.id !== productId));
      setMessage("Removed from wishlist");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to remove item");
    }
  };

  const addToCart = async (productId, size = "M") => {
    try {
      await api.post("/cart", { productId, quantity: 1, action: "add", size });
      setMessage("Added to cart");
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot add to cart");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>My Wishlist</Typography>
        <Typography color="text.secondary">Save your favorite products and quickly move them to cart.</Typography>
      </Paper>

      {!wishlist.length ? <Alert severity="info">No products in wishlist yet.</Alert> : null}
      <Grid container spacing={2}>
        {wishlist.map((product) => (
          <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ProductCard
              product={product}
              serverNow={serverNow}
              onAdd={addToCart}
              onWishlist={removeFromWishlist}
              wishlistLabel="Remove"
            />
          </Grid>
        ))}
      </Grid>

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage("")}>
        <Alert severity="info">{message}</Alert>
      </Snackbar>
    </Container>
  );
}
