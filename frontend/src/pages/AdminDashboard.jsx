import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Grid from "@mui/material/Grid2";
import { useLocation } from "react-router-dom";
import ProductImage from "../components/ProductImage";
import api from "../services/api";
import socket from "../services/socket";
import { inr } from "../utils/currency";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function blankProductForm() {
  return {
    name: "",
    description: "",
    category: "",
    brand: "",
    price: "",
    stock: "",
    image: "",
    referenceImages: ""
  };
}

const productCategories = ["Electronics", "Fashion", "Home", "Sports", "Books", "Furniture", "Mobiles"];

function blankFlashSaleForm() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(Date.now() + 4 * 60 * 60 * 1000);

  return {
    productId: "",
    discountPrice: "",
    stockLimit: "",
    startTime: formatDateTimeLocal(start),
    endTime: formatDateTimeLocal(end)
  };
}

function blankCouponForm() {
  return {
    code: "",
    description: "",
    type: "percentage",
    value: "",
    minSubtotal: "",
    maxDiscount: "",
    isActive: true
  };
}

function formatDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

export default function AdminDashboard() {
  const theme = useTheme();
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(blankProductForm);
  const [flashSaleForm, setFlashSaleForm] = useState(blankFlashSaleForm);
  const [couponForm, setCouponForm] = useState(blankCouponForm);

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) || null,
    [products, editingProductId]
  );

  const activeFlashSales = useMemo(
    () => flashSales.filter((sale) => sale.isActive),
    [flashSales]
  );

  const revenueSummary = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        summary.subtotal += Number(order.subtotal || order.total || 0);
        summary.discount += Number(order.discount || 0);
        summary.total += Number(order.total || 0);
        if (order.appliedCoupon?.code) {
          summary.couponUsage[order.appliedCoupon.code] = (summary.couponUsage[order.appliedCoupon.code] || 0) + 1;
        }
        return summary;
      },
      { subtotal: 0, discount: 0, total: 0, couponUsage: {} }
    );
  }, [orders]);

  const stats = useMemo(
    () => [
      { label: "Users", value: users.length, helper: "Registered accounts" },
      { label: "Products", value: products.length, helper: "Catalog items" },
      { label: "Orders", value: orders.length, helper: "Purchase history" },
      { label: "Live Sales", value: activeFlashSales.length, helper: "Currently active" }
    ],
    [users.length, products.length, orders.length, activeFlashSales.length]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, ordersRes, productsRes, flashSalesRes, couponsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/orders"),
        api.get("/products"),
        api.get("/flash-sales"),
        api.get("/admin/coupons")
      ]);

      setUsers(usersRes.data.users || []);
      setOrders(ordersRes.data.orders || []);
      setProducts(productsRes.data.products || []);
      setFlashSales(flashSalesRes.data.flashSales || []);
      setCoupons(couponsRes.data.coupons || []);
      setError("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch((caughtError) => {
      setError(getErrorMessage(caughtError, "Failed to load admin data"));
    });
  }, []);

  useEffect(() => {
    const pushLiveEvent = (message) => {
      setLiveEvents((prev) => [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message },
        ...prev
      ].slice(0, 6));
    };

    const onCatalogSnapshot = (snapshot) => {
      if (Array.isArray(snapshot?.products)) {
        setProducts(snapshot.products);
      }
      if (Array.isArray(snapshot?.flashSales)) {
        setFlashSales(snapshot.flashSales);
      }
    };

    const onStockUpdate = ({ productId, stock }) => {
      pushLiveEvent(`Stock update: ${productId} now has ${stock} left`);
      setProducts((prev) => prev.map((product) => (product.id === productId ? { ...product, stock } : product)));
    };

    const onStockLow = ({ productId, left }) => {
      pushLiveEvent(`Low stock warning: ${productId} has only ${left} left`);
    };

    const onPurchase = ({ userName, total }) => {
      pushLiveEvent(`New order: ${userName || "Customer"} placed ${inr(total || 0)} worth of items`);
      load().catch(() => {});
    };

    const onOrder = ({ userName, total, id }) => {
      pushLiveEvent(`Order ${id} created for ${userName || "Customer"} - ${inr(total || 0)}`);
    };

    const onFlashStarted = ({ saleId }) => pushLiveEvent(`Flash sale started: ${saleId}`);
    const onFlashExpired = ({ saleId }) => pushLiveEvent(`Flash sale expired: ${saleId}`);

    socket.on("catalog:snapshot", onCatalogSnapshot);
    socket.on("stock:update", onStockUpdate);
    socket.on("stock:low", onStockLow);
    socket.on("purchase:new", onPurchase);
    socket.on("order:new", onOrder);
    socket.on("flashSale:started", onFlashStarted);
    socket.on("flashSale:expired", onFlashExpired);

    return () => {
      socket.off("catalog:snapshot", onCatalogSnapshot);
      socket.off("stock:update", onStockUpdate);
      socket.off("stock:low", onStockLow);
      socket.off("purchase:new", onPurchase);
      socket.off("order:new", onOrder);
      socket.off("flashSale:started", onFlashStarted);
      socket.off("flashSale:expired", onFlashExpired);
    };
  }, []);

  useEffect(() => {
    const nextTab = location.state?.activeTab;
    if (typeof nextTab === "number") {
      setTab(nextTab);
    }

    if (location.state?.openProductDialog) {
      openCreateProduct();
    }
  }, [location.state]);

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(blankProductForm());
    setProductDialogOpen(true);
  };

  const openEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      brand: product.brand || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      image: product.image || "",
      referenceImages: Array.isArray(product.referenceImages) ? product.referenceImages.join(", ") : ""
    });
    setProductDialogOpen(true);
  };

  const handleProductImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProductForm((prev) => ({
        ...prev,
        image: typeof reader.result === "string" ? reader.result : prev.image
      }));
    };
    reader.readAsDataURL(file);
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
  };

  const saveProduct = async () => {
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock)
    };

    if (!payload.name || !payload.description || !payload.category || !Number.isFinite(payload.price) || !Number.isFinite(payload.stock)) {
      setError("Please fill in the required product fields.");
      return;
    }

    if (payload.referenceImages.trim()) {
      payload.referenceImages = payload.referenceImages;
    } else {
      delete payload.referenceImages;
    }

    try {
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        setMessage("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        setMessage("Product created successfully.");
      }
      closeProductDialog();
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to save product"));
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/products/${product.id}`);
      setMessage("Product deleted successfully.");
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to delete product"));
    }
  };

  const createFlashSale = async () => {
    try {
      const payload = {
        productId: flashSaleForm.productId,
        discountPrice: Number(flashSaleForm.discountPrice),
        stockLimit: Number(flashSaleForm.stockLimit),
        startTime: new Date(flashSaleForm.startTime).toISOString(),
        endTime: new Date(flashSaleForm.endTime).toISOString()
      };

      if (!payload.productId || !Number.isFinite(payload.discountPrice) || !Number.isFinite(payload.stockLimit) || !payload.startTime || !payload.endTime) {
        setError("Please complete the flash sale form.");
        return;
      }

      await api.post("/flash-sales", payload);
      setMessage("Flash sale created successfully.");
      setFlashSaleForm(blankFlashSaleForm());
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to create flash sale"));
    }
  };

  const removeFlashSale = async (saleId) => {
    try {
      await api.delete(`/flash-sales/${saleId}`);
      setMessage("Flash sale removed successfully.");
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to remove flash sale"));
    }
  };

  const saveCoupon = async () => {
    try {
      const payload = {
        ...couponForm,
        value: Number(couponForm.value),
        minSubtotal: Number(couponForm.minSubtotal),
        maxDiscount: Number(couponForm.maxDiscount)
      };
      await api.post("/admin/coupons", payload);
      setMessage("Coupon created successfully.");
      setCouponForm(blankCouponForm());
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to save coupon"));
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      await api.put(`/admin/coupons/${coupon.code}`, {
        isActive: !coupon.isActive
      });
      setMessage(`Coupon ${coupon.code} updated.`);
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to update coupon"));
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      setMessage("Order status updated.");
      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to update order status"));
    }
  };

  const selectedProduct = editingProduct || null;

  return (
    <Container sx={{ py: 3 }}>
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Admin Command Center</Typography>
        <Typography color="text.secondary">
          Control products, flash sales, orders, and users from one admin-only dashboard.
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {stats.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                height: "100%"
              }}
            >
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                {item.label}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                {item.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {item.helper}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_event, nextTab) => setTab(nextTab)} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="Products" />
          <Tab label="Flash Sales" />
          <Tab label="Orders" />
          <Tab label="Users" />
        </Tabs>
      </Paper>

      {loading ? <Alert sx={{ mb: 2 }} severity="info">Loading admin data...</Alert> : null}
      {error ? <Alert sx={{ mb: 2 }} severity="error">{error}</Alert> : null}
      {message ? <Alert sx={{ mb: 2 }} severity="success">{message}</Alert> : null}

      {tab === 0 ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Live Ops Feed</Typography>
            {liveEvents.length ? (
              <Stack spacing={1}>
                {liveEvents.map((event) => (
                  <Box key={event.id} sx={{ p: 1.2, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                    <Typography variant="body2">{event.message}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Waiting for live store activity...</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Quick Actions
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={openCreateProduct}>Add Product</Button>
              <Button variant="outlined" onClick={() => setTab(2)}>Create Flash Sale</Button>
              <Button variant="outlined" onClick={load}>Refresh Data</Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Revenue Snapshot</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">Gross sales</Typography>
                <Typography sx={{ fontWeight: 800 }}>{inr(revenueSummary.subtotal)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Discounts given</Typography>
                <Typography sx={{ fontWeight: 800 }}>{inr(revenueSummary.discount)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Net revenue</Typography>
                <Typography sx={{ fontWeight: 800 }}>{inr(revenueSummary.total)}</Typography>
              </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2 }}>
              Coupon usage: {Object.keys(revenueSummary.couponUsage).length ? Object.entries(revenueSummary.couponUsage).map(([code, count]) => `${code} (${count})`).join(", ") : "No coupons used yet"}
            </Typography>
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Recent Orders</Typography>
                <Stack spacing={1}>
                  {orders.slice(0, 4).map((order) => (
                    <Box key={order.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                      <Typography sx={{ fontWeight: 700 }}>{order.userName || order.userEmail || "Unknown customer"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.items?.length || 0} items - {inr(order.total || 0)}
                      </Typography>
                    </Box>
                  ))}
                  {!orders.length ? <Alert severity="info">No orders yet.</Alert> : null}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Live Sales</Typography>
                <Stack spacing={1}>
                  {activeFlashSales.slice(0, 4).map((sale) => {
                    const product = products.find((item) => item.id === sale.productId);
                    return (
                      <Box key={sale.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                        <Typography sx={{ fontWeight: 700 }}>{product?.name || sale.productId}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {inr(sale.discountPrice)} | {sale.remaining} left
                        </Typography>
                      </Box>
                    );
                  })}
                  {!activeFlashSales.length ? <Alert severity="info">No active flash sales right now.</Alert> : null}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      ) : null}

      {tab === 1 ? (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Products ({products.length})</Typography>
            <Button variant="contained" onClick={openCreateProduct}>Add Product</Button>
          </Stack>

          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid key={product.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 2 }}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={product.category || "Uncategorized"} size="small" />
                        <Chip label={product.brand || "Generic"} size="small" variant="outlined" />
                        {product.flashSale ? <Chip label="Flash Sale" color="error" size="small" /> : null}
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.description}
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {inr(product.flashSale ? product.flashSale.discountPrice : product.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stock: {product.stock} | Views: {product.views || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rating: {product.ratingSummary?.average || "0.0"} / 5 ({product.ratingSummary?.count || 0} reviews)
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
                    <Button size="small" onClick={() => openEditProduct(product)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => deleteProduct(product)}>Delete</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          {!products.length ? <Alert severity="info">No products found.</Alert> : null}
        </Stack>
      ) : null}

      {tab === 2 ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Create Flash Sale</Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Product"
                  value={flashSaleForm.productId}
                  onChange={(event) => setFlashSaleForm((prev) => ({ ...prev, productId: event.target.value }))}
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Discount Price"
                  type="number"
                  value={flashSaleForm.discountPrice}
                  onChange={(event) => setFlashSaleForm((prev) => ({ ...prev, discountPrice: event.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Stock Limit"
                  type="number"
                  value={flashSaleForm.stockLimit}
                  onChange={(event) => setFlashSaleForm((prev) => ({ ...prev, stockLimit: event.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={flashSaleForm.startTime}
                  onChange={(event) => setFlashSaleForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={flashSaleForm.endTime}
                  onChange={(event) => setFlashSaleForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <Button variant="contained" onClick={createFlashSale}>Create Flash Sale</Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Create Coupon</Typography>
              <Stack spacing={2}>
                <TextField label="Coupon Code" value={couponForm.code} onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} fullWidth />
                <TextField label="Description" value={couponForm.description} onChange={(event) => setCouponForm((prev) => ({ ...prev, description: event.target.value }))} fullWidth />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField select label="Type" value={couponForm.type} onChange={(event) => setCouponForm((prev) => ({ ...prev, type: event.target.value }))} fullWidth>
                    <MenuItem value="percentage">Percentage</MenuItem>
                    <MenuItem value="flat">Flat</MenuItem>
                  </TextField>
                  <TextField label="Value" type="number" value={couponForm.value} onChange={(event) => setCouponForm((prev) => ({ ...prev, value: event.target.value }))} fullWidth />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField label="Min Subtotal" type="number" value={couponForm.minSubtotal} onChange={(event) => setCouponForm((prev) => ({ ...prev, minSubtotal: event.target.value }))} fullWidth />
                  <TextField label="Max Discount" type="number" value={couponForm.maxDiscount} onChange={(event) => setCouponForm((prev) => ({ ...prev, maxDiscount: event.target.value }))} fullWidth />
                </Stack>
                <Button variant="contained" onClick={saveCoupon}>Save Coupon</Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Flash Sales ({flashSales.length})</Typography>
              <Stack spacing={1.2}>
                {flashSales.map((sale) => {
                  const product = products.find((item) => item.id === sale.productId);
                  const statusLabel = sale.isActive ? "Active" : sale.isScheduled ? "Scheduled" : sale.isSoldOut ? "Sold out" : "Expired";

                  return (
                    <Box key={sale.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{product?.name || sale.productId}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {inr(sale.discountPrice)} | Stock limit {sale.stockLimit} | Sold {sale.sold}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDisplayDate(sale.startTime)} to {formatDisplayDate(sale.endTime)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={statusLabel} color={sale.isActive ? "success" : "default"} />
                          <Button size="small" color="error" onClick={() => removeFlashSale(sale.id)}>Remove</Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
                {!flashSales.length ? <Alert severity="info">No flash sales created yet.</Alert> : null}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Coupons ({coupons.length})</Typography>
              <Stack spacing={1.2}>
                {coupons.map((coupon) => (
                  <Box key={coupon.code} sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{coupon.code}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {coupon.description || "No description"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {coupon.type} | value {coupon.value} | min subtotal {coupon.minSubtotal} | max discount {coupon.maxDiscount}
                        </Typography>
                      </Box>
                      <Button variant={coupon.isActive ? "outlined" : "contained"} onClick={() => toggleCoupon(coupon)}>
                        {coupon.isActive ? "Disable" : "Enable"}
                      </Button>
                    </Stack>
                  </Box>
                ))}
                {!coupons.length ? <Alert severity="info">No coupons created yet.</Alert> : null}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      {tab === 3 ? (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Orders ({orders.length})</Typography>
          {orders.map((order) => (
            <Card key={order.id} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{order.userName || "Unknown user"}</Typography>
                      <Typography variant="body2" color="text.secondary">{order.userEmail}</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800 }}>{inr(order.total || 0)}</Typography>
                  </Stack>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Order ID: {order.id} | Items: {order.items?.length || 0} | Date: {formatDisplayDate(order.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal: {inr(order.subtotal || order.total || 0)} | Discount: {inr(order.discount || 0)} | Total: {inr(order.total || 0)}
                  </Typography>
                  {order.appliedCoupon?.code ? (
                  <Typography variant="body2" color="success.main">
                      Coupon used: {order.appliedCoupon.code}
                    </Typography>
                  ) : null}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "stretch", sm: "center" }}>
                    <Chip label={`Status: ${order.status || "confirmed"}`} color={order.status === "delivered" ? "success" : order.status === "cancelled" ? "error" : "default"} />
                    <TextField
                      select
                      size="small"
                      label="Update Status"
                      value={order.status || "confirmed"}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                      sx={{ minWidth: 190 }}
                    >
                      {["confirmed", "packed", "shipped", "delivered", "cancelled", "returned"].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack spacing={0.8}>
                    {order.items?.map((item) => (
                      <Box key={`${order.id}-${item.productId}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.quantity} x {inr(item.unitPrice)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!orders.length ? <Alert severity="info">No orders found.</Alert> : null}
        </Stack>
      ) : null}

      {tab === 4 ? (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Users ({users.length})</Typography>
          <Grid container spacing={2}>
            {users.map((user) => (
              <Grid key={user.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography sx={{ fontWeight: 800 }}>{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                      <Typography variant="body2" color="text.secondary">ID: {user.id}</Typography>
                      <Typography variant="body2" color="text.secondary">Wishlist items: {user.wishlist?.length || 0}</Typography>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Chip label={user.role} color={user.role === "admin" ? "error" : "default"} />
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          {!users.length ? <Alert severity="info">No users found.</Alert> : null}
        </Stack>
      ) : null}

      <Dialog open={productDialogOpen} onClose={closeProductDialog} fullWidth maxWidth="md">
        <DialogTitle>{selectedProduct ? `Edit Product: ${selectedProduct.name}` : "Add Product"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              minRows={3}
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Category"
                value={productForm.category}
                onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {productCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="Brand"
                value={productForm.brand}
                onChange={(event) => setProductForm((prev) => ({ ...prev, brand: event.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={productForm.price}
                onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              <TextField
                fullWidth
                label="Stock"
                type="number"
                value={productForm.stock}
                onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
              />
            </Stack>
            <TextField
              fullWidth
              label="Image URL"
              value={productForm.image}
              onChange={(event) => setProductForm((prev) => ({ ...prev, image: event.target.value }))}
            />
            <Button component="label" variant="outlined" sx={{ alignSelf: "flex-start" }}>
              Upload Product Image
              <input hidden type="file" accept="image/*" onChange={handleProductImageUpload} />
            </Button>
            <ProductImage
              src={productForm.image}
              alt="Product preview"
              sx={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
            />
            <TextField
              fullWidth
              label="Reference Images"
              helperText="Comma-separated image URLs"
              value={productForm.referenceImages}
              onChange={(event) => setProductForm((prev) => ({ ...prev, referenceImages: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProductDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveProduct}>
            {selectedProduct ? "Save Changes" : "Create Product"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
