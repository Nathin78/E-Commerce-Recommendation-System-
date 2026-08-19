const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_ENABLED = "false";
process.env.PERSIST_TO_FILE = "false";

const { ready, state } = require("../src/data/store");
const { updateCart } = require("../src/controllers/cartController");

function mockResponse() {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  return response;
}

test("clear cart action removes all items and coupon data", async () => {
  await ready();

  const cart = {
    userId: "u-user",
    items: [
      {
        productId: "p1",
        quantity: 2,
        size: "M"
      }
    ],
    couponCode: "SAVE10"
  };

  const previousCartIndex = state.carts.findIndex((entry) => entry.userId === cart.userId);
  const previousCart = previousCartIndex >= 0 ? state.carts[previousCartIndex] : null;

  if (previousCartIndex >= 0) {
    state.carts[previousCartIndex] = cart;
  } else {
    state.carts.push(cart);
  }

  const req = {
    user: { id: cart.userId },
    body: { action: "clear" }
  };
  const res = mockResponse();

  try {
    await updateCart(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Cart cleared");
    assert.equal(res.body.cart.items.length, 0);
    assert.equal(res.body.cart.appliedCoupon, null);
    assert.equal(res.body.cart.total, 0);
  } finally {
    if (previousCartIndex >= 0) {
      state.carts[previousCartIndex] = previousCart;
    } else {
      state.carts = state.carts.filter((entry) => entry.userId !== cart.userId);
    }
  }
});
