// Offline demonstration only: a local artifact, never a hosted deployment.
import { mkdirSync, writeFileSync } from "node:fs";
import { confirmOrder, invoiceBatch } from "../src/orders.mjs";
const environment = process.argv[2];
if (!["staging", "production"].includes(environment)) throw new Error("expected staging or production");
const out = new URL(`../dist/${environment}/`, import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("orders.json", out), JSON.stringify({
  synthetic: true, environment,
  invoices: invoiceBatch([confirmOrder({ id: "DEMO-1", lines: [{ code: "MUG", quantity: 2 }] }, ["MUG"])]),
}, null, 2) + "\n");
console.log(`Synthetic local artifact: dist/${environment}/orders.json; no hosted service changed.`);
