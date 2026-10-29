/** Graph API version the clients use when none is passed. */
export const DEFAULT_GRAPH_API_VERSION = "v25.0";

const GRAPH_API_VERSION_PATTERN = /^v\d{1,3}\.\d{1,2}$/;

/**
 * Base URL for a Graph API version, e.g. `https://graph.facebook.com/v25.0`.
 *
 * The version lands in every request path, so anything that isn't `vNN.N` is
 * refused instead of being interpolated.
 */
export const graphApiBaseUrl = (version: string = DEFAULT_GRAPH_API_VERSION): string => {
  if (!GRAPH_API_VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid Graph API version "${version}", expected a value like "v25.0"`);
  }
  return `https://graph.facebook.com/${version}`;
};

const GRAPH_NODE_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * Refuses an id that would change the request path (`../`, `/`, `?`, ...).
 * Page, Instagram account and scoped user ids are numeric; the wider pattern
 * keeps test fixtures and `me` working.
 */
export const assertGraphNodeId = (id: string, label: string): string => {
  if (typeof id !== "string" || !GRAPH_NODE_ID_PATTERN.test(id) || id === "." || id === "..") {
    throw new Error(`Invalid ${label}: ${JSON.stringify(id)}`);
  }
  return id;
};
