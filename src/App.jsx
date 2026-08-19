import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import AdminDashboard from "./pages/AdminDashboard";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import WishlistPage from "./pages/WishlistPage";
import LandingPage from "./pages/LandingPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import ProfilePage from "./pages/ProfilePage";
import socket from "./services/socket";

function App() {
  const [serverNow, setServerNow] = useState(Date.now());
  const [lowStockMessage, setLowStockMessage] = useState("");
  const { isAuthenticated, user } = useAuth();
  const authenticatedHome = user?.role === "admin" ? "/admin" : "/shop";

  useEffect(() => {
    const onTime = ({ now }) => setServerNow(now);
    const onLowStock = ({ productId, left }) => {
      setLowStockMessage(`Low stock alert for ${productId}: only ${left} left`);
      setTimeout(() => setLowStockMessage(""), 2500);
    };
    const onSaleStarted = ({ saleId }) => {
      setLowStockMessage(`Flash sale ${saleId} just started`);
      setTimeout(() => setLowStockMessage(""), 2500);
    };
    const onSaleExpired = ({ saleId }) => {
      setLowStockMessage(`Flash sale ${saleId} expired`);
      setTimeout(() => setLowStockMessage(""), 2500);
    };

    socket.on("server:time", onTime);
    socket.on("stock:low", onLowStock);
    socket.on("flashSale:started", onSaleStarted);
    socket.on("flashSale:expired", onSaleExpired);

    return () => {
      socket.off("server:time", onTime);
      socket.off("stock:low", onLowStock);
      socket.off("flashSale:started", onSaleStarted);
      socket.off("flashSale:expired", onSaleExpired);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar lowStockMessage={lowStockMessage} />
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<HomePage serverNow={serverNow} />} />
          <Route path="/products/:id" element={<ProductPage serverNow={serverNow} />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <RegisterPage />} />
          <Route path="/auth" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <AuthPage />} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage serverNow={serverNow} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      <Footer />
    </Box>
  );
}

export default App;
