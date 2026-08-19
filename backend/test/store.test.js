const test = require("node:test");
const assert = require("node:assert/strict");
process.env.DB_ENABLED = "false";
const { ready, getStoreHealth } = require("../src/data/store");

test("store health exposes persistence flags and counts", async () => {
  await ready();
  const health = getStoreHealth();

  assert.equal(typeof health.persistence.file, "boolean");
  assert.equal(typeof health.persistence.databaseConfigured, "boolean");
  assert.equal(typeof health.counts.products, "number");
  assert.ok(health.counts.products > 0);
});
