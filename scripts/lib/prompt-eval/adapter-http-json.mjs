/**
 * The one F2 adapter. Endpoint, credential, and model are all caller supplied;
 * no provider name, model ID, or pricing is embedded here.
 */
export function createHttpJsonAdapter({ endpoint, apiKey, fetchFn = fetch }) {
  if (!endpoint) throw new Error("missing endpoint");
  if (!apiKey) throw new Error("missing credentials");
  async function request(body) {
    const response = await fetchFn(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`provider returned ${response.status}`);
    return response.json();
  }
  return {
    async run({ input, model }) {
      const value = await request({ kind: "run", input, model });
      if (typeof value.output !== "string" || !validUsage(value.usage)) throw new Error("provider response lacks output or usage");
      return value;
    },
    async judge({ output, criteria, model }) {
      const value = await request({ kind: "judge", output, criteria, model });
      if ((value.score !== 0 && value.score !== 1) || typeof value.reason !== "string" || !validUsage(value.usage)) {
        throw new Error("provider response lacks a structured judge verdict");
      }
      return value;
    },
  };
}

function validUsage(usage) {
  return Number.isInteger(usage?.input_tokens) && usage.input_tokens >= 0
    && Number.isInteger(usage?.output_tokens) && usage.output_tokens >= 0;
}
