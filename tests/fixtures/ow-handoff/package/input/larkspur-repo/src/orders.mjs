// Invented, offline fixture: no mailbox, sheet or accounting service is contacted.
export function confirmOrder(order, knownCodes) {
  if (!order || typeof order.id !== "string" || !order.id.trim()) throw new Error("order id is required");
  if (!Array.isArray(order.lines) || order.lines.length === 0) throw new Error("order lines are required");
  const lines = order.lines.map(({ code, quantity }) => {
    if (typeof code !== "string" || !code.trim()) throw new Error("product code is required");
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("quantity must be a positive integer");
    return { code: code.trim().toUpperCase(), quantity };
  });
  const unknown = [...new Set(lines.filter(({ code }) => !knownCodes.includes(code)).map(({ code }) => code))];
  return { id: order.id.trim(), state: unknown.length ? "needs-review" : "confirmed", lines, unknown };
}

export function invoiceBatch(orders) {
  const ids = new Set();
  return orders.filter(({ state }) => state === "confirmed").map((order) => {
    if (ids.has(order.id)) throw new Error("duplicate order id");
    ids.add(order.id);
    return { orderId: order.id, lines: order.lines.map((line) => ({ ...line })) };
  });
}
