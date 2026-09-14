import { createHttpJsonAdapter } from "./adapter-http-json.mjs";

/** Maps CLI options to an adapter or an explicit non-authorizing failure. */
export function selectAdapter({ adapter, endpoint, apiKey, fetchFn }) {
  if (!adapter) return { failure: { code: "missing_provider", message: "--adapter is required" } };
  if (adapter !== "http-json") return { failure: { code: "invalid_adapter_config", message: `unsupported adapter: ${adapter}` } };
  if (!apiKey) return { failure: { code: "missing_credentials", message: "configured API key is missing or empty" } };
  if (!endpoint) return { failure: { code: "invalid_adapter_config", message: "--endpoint is required for http-json" } };
  return { adapter: createHttpJsonAdapter({ endpoint, apiKey, fetchFn }) };
}
