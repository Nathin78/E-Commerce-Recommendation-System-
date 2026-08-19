const { state, enrichProduct, saveToDisk, newId, getFlashSaleStatus } = require("../data/store");
const { createError, asyncHandler } = require("../utils/helpers");
const { getIO } = require("../socket/socketManager");

const getFlashSales = asyncHandler(async (_req, res) => {
  const now = Date.now();

  const sales = state.flashSales.map((sale) => {
    const product = state.products.find((p) => p.id === sale.productId);
    const status = getFlashSaleStatus(sale, now);

    return {
      ...sale,
      ...status,
      product: product ? enrichProduct(product) : null
    };
  });

  return res.json({ flashSales: sales });
});

const createFlashSale = asyncHandler(async (req, res) => {
  const { productId, discountPrice, startTime, endTime, stockLimit } = req.body;

  if (!productId || discountPrice == null || !startTime || !endTime || stockLimit == null) {
    throw createError("Missing flash sale fields", 400);
  }

  const product = state.products.find((p) => p.id === productId);
  if (!product) throw createError("Product not found", 404);

  const parsedStart = new Date(startTime).getTime();
  const parsedEnd = new Date(endTime).getTime();
  const discount = Number(discountPrice);
  const saleStockLimit = Number(stockLimit);

  if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd)) {
    throw createError("Invalid startTime or endTime", 400);
  }
  if (parsedEnd <= parsedStart) {
    throw createError("endTime must be greater than startTime", 400);
  }
  if (!Number.isFinite(discount) || discount <= 0 || discount >= product.price) {
    throw createError("discountPrice must be positive and less than product price", 400);
  }
  if (!Number.isFinite(saleStockLimit) || saleStockLimit <= 0 || saleStockLimit > product.stock) {
    throw createError("stockLimit must be > 0 and <= product stock", 400);
  }

  const overlap = state.flashSales.some((sale) => {
    if (sale.productId !== productId) return false;
    const existingStart = new Date(sale.startTime).getTime();
    const existingEnd = new Date(sale.endTime).getTime();
    return parsedStart < existingEnd && parsedEnd > existingStart;
  });
  if (overlap) {
    throw createError("A flash sale already exists for this time window", 409);
  }

  const sale = {
    id: newId("fs"),
    productId,
    discountPrice: discount,
    startTime: new Date(parsedStart).toISOString(),
    endTime: new Date(parsedEnd).toISOString(),
    stockLimit: saleStockLimit,
    sold: 0
  };

  state.flashSales.push(sale);
  saveToDisk();
  getIO().emit("flashSale:created", {
    ...sale,
    ...getFlashSaleStatus(sale)
  });

  return res.status(201).json({ flashSale: sale });
});

const deleteFlashSale = asyncHandler(async (req, res) => {
  const index = state.flashSales.findIndex((sale) => sale.id === req.params.saleId);
  if (index === -1) {
    throw createError("Flash sale not found", 404);
  }

  state.flashSales.splice(index, 1);
  saveToDisk();
  getIO().emit("catalog:snapshot", {
    products: state.products.map(enrichProduct),
    flashSales: state.flashSales.map((sale) => ({
      ...sale,
      ...getFlashSaleStatus(sale)
    }))
  });

  return res.json({ message: "Flash sale removed successfully" });
});

module.exports = { getFlashSales, createFlashSale, deleteFlashSale };
