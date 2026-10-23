// node:test suite, deliberately .cjs so the product's Vitest glob does not collect it.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const subject = import("../src/orders.mjs");

test("known order lines are normalized and confirmed", async () => {
  const { confirmOrder } = await subject;
  assert.deepEqual(confirmOrder({ id: " PO-1 ", lines: [{ code: " mug ", quantity: 2 }] }, ["MUG"]), {
    id: "PO-1", state: "confirmed", lines: [{ code: "MUG", quantity: 2 }], unknown: [],
  });
});
test("unknown codes require review and cannot reach invoices", async () => {
  const { confirmOrder, invoiceBatch } = await subject;
  const order = confirmOrder({ id: "PO-2", lines: [{ code: "vase", quantity: 1 }] }, ["MUG"]);
  assert.equal(order.state, "needs-review");
  assert.deepEqual(order.unknown, ["VASE"]);
  assert.deepEqual(invoiceBatch([order]), []);
});
test("missing order ids and empty line lists fail", async () => {
  const { confirmOrder } = await subject;
  assert.throws(() => confirmOrder({ id: "", lines: [] }, []), /order id/);
  assert.throws(() => confirmOrder({ id: "PO-3", lines: [] }, []), /order lines/);
});
test("blank codes and invalid quantities fail", async () => {
  const { confirmOrder } = await subject;
  assert.throws(() => confirmOrder({ id: "PO-3", lines: [{ code: " ", quantity: 1 }] }, []), /product code/);
  for (const quantity of [0, -1, 1.5, "2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => confirmOrder({ id: "PO-3", lines: [{ code: "MUG", quantity }] }, ["MUG"]), /quantity/);
  }
});
test("confirmed orders form an invoice payload without sharing mutable lines", async () => {
  const { confirmOrder, invoiceBatch } = await subject;
  const order = confirmOrder({ id: "PO-4", lines: [{ code: "MUG", quantity: 2 }] }, ["MUG"]);
  const batch = invoiceBatch([order]);
  assert.deepEqual(batch, [{ orderId: "PO-4", lines: [{ code: "MUG", quantity: 2 }] }]);
  batch[0].lines[0].quantity = 9;
  assert.equal(order.lines[0].quantity, 2);
});
test("duplicate confirmed orders cannot create duplicate invoices", async () => {
  const { confirmOrder, invoiceBatch } = await subject;
  const order = confirmOrder({ id: "PO-5", lines: [{ code: "MUG", quantity: 1 }] }, ["MUG"]);
  assert.throws(() => invoiceBatch([order, order]), /duplicate/);
});
