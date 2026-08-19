import test from "node:test";
import assert from "node:assert/strict";
import { inr } from "../src/utils/currency.js";

test("inr formats rupee values", () => {
  assert.match(inr(1999), /₹/);
  assert.match(inr(1999), /1,999|1,999\.00|1,999.00/);
});
