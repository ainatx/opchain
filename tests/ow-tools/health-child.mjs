// Child process for the C14 fs-read spy: runs health against the in-process
// stubs under the fence's fs recorder (network traps off), prints the result.
import { health } from "../../plugins/ow-tools/lib/health.mjs";
import { startStubs } from "./health-stubs.mjs";

const [dir, config] = process.argv.slice(2);
const stubs = await startStubs(dir);
const r = await health({ config }, stubs.deps);
await stubs.close();
process.stdout.write(JSON.stringify({ summary: r.summary, hosts: stubs.requests.map((q) => q.host) }));
