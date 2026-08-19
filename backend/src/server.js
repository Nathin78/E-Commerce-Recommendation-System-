require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { setIO } = require("./socket/socketManager");
const { state, saveToDisk, enrichProduct, getFlashSaleStatus, ready, refreshDailyAutoFlashSales } = require("./data/store");

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
];
const configuredOrigins = String(process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

async function startServer() {
  await ready();

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  setIO(io);

  const broadcastCatalogSnapshot = () => {
    io.emit("catalog:snapshot", {
      products: state.products.map(enrichProduct),
      flashSales: state.flashSales.map((sale) => ({
        ...sale,
        ...getFlashSaleStatus(sale)
      }))
    });
  };

  io.on("connection", (socket) => {
    socket.emit("server:time", { now: Date.now() });
    socket.emit("catalog:snapshot", {
      products: state.products.map(enrichProduct),
      flashSales: state.flashSales.map((sale) => ({
        ...sale,
        ...getFlashSaleStatus(sale)
      }))
    });
  });

  const initialAutoRefresh = refreshDailyAutoFlashSales(Date.now());
  if (initialAutoRefresh.updated) {
    saveToDisk();
  }

  setInterval(() => {
    io.emit("server:time", { now: Date.now() });
  }, 1000);

  let previousActive = new Set();
  setInterval(() => {
    const now = Date.now();
    const activeNow = new Set();
    const tickPayload = [];

    state.flashSales.forEach((sale) => {
      const status = getFlashSaleStatus(sale, now);
      tickPayload.push({
        saleId: sale.id,
        productId: sale.productId,
        ...status
      });
      if (status.isActive) {
        activeNow.add(sale.id);
      }
    });

    io.emit("flashSale:tick", tickPayload);

    for (const saleId of activeNow) {
      if (!previousActive.has(saleId)) {
        io.emit("flashSale:started", { saleId });
      }
    }

    for (const saleId of previousActive) {
      if (!activeNow.has(saleId)) {
        io.emit("flashSale:expired", { saleId });
      }
    }

    previousActive = activeNow;
  }, 1000);

  setInterval(() => {
    const refreshResult = refreshDailyAutoFlashSales(Date.now());
    if (!refreshResult.updated) return;

    saveToDisk();
    refreshResult.createdSales.forEach((sale) => {
      io.emit("flashSale:created", {
        ...sale,
        ...getFlashSaleStatus(sale)
      });
    });
    broadcastCatalogSnapshot();
  }, 60 * 1000);

  setInterval(() => {
    saveToDisk();
  }, 15000);

  server.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
