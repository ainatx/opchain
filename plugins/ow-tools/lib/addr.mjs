// IP address rules (design §5.8 and §5.6), with no imports at all, so both
// net.mjs (health) and capture.mjs can use them without capture pulling a
// network module into the no-network verbs' import graph (C25 a).

export function ipv4(a) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(a)) return null;
  const p = a.split(".").map(Number);
  return p.every((n) => n <= 255) ? p : null;
}

export function ipv6Words(a) {
  let s = String(a).toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!/^[0-9a-f:.]+$/.test(s) || !s.includes(":")) return null;
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    const p = ipv4(tail[1]);
    if (!p) return null;
    s = s.slice(0, -tail[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  if ((s.match(/::/g) || []).length > 1) return null;
  const [head, rest] = s.split("::");
  const h = head ? head.split(":") : [];
  const r = rest !== undefined && rest ? rest.split(":") : [];
  const fill = s.includes("::") ? 8 - h.length - r.length : 0;
  if (fill < 0 || (!s.includes("::") && h.length !== 8)) return null;
  const parts = [...h, ...new Array(fill).fill("0"), ...r];
  if (parts.some((w) => !/^[0-9a-f]{1,4}$/.test(w))) return null;
  const words = parts.map((w) => parseInt(w, 16));
  return words.length === 8 ? words : null;
}

export function v4Blocked([a, b, c]) {
  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol assignments, TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 6to4 relay anycast
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved, broadcast
  );
}

const embedded = (hi, lo) => [hi >> 8, hi & 255, lo >> 8, lo & 255];

// True when ow-tools must not connect to this address. IPv6 is an allowlist:
// only global unicast (2000::/3) passes, minus the special ranges inside it;
// forms that embed an IPv4 address are judged by that address.
export function blockedAddress(address) {
  const four = ipv4(address);
  if (four) return v4Blocked(four);
  const w = ipv6Words(address);
  if (!w) return true;
  const zeros = (n) => w.slice(0, n).every((x) => x === 0);
  if (zeros(5) && w[5] === 0xffff) return v4Blocked(embedded(w[6], w[7])); // IPv4-mapped ::ffff:a.b.c.d
  if (zeros(4) && w[4] === 0xffff && w[5] === 0) return true; // IPv4-translated ::ffff:0:0/96 (SIIT): never a public destination
  if (zeros(6)) return true; // ::, ::1 and IPv4-compatible
  if (w[0] === 0x64 && w[1] === 0xff9b && w[2] === 0 && w[3] === 0 && w[4] === 0 && w[5] === 0) return v4Blocked(embedded(w[6], w[7])); // NAT64 well-known
  if ((w[0] & 0xe000) !== 0x2000) return true; // outside global unicast: fc00::/7, fe80::/10, fec0::/10, ff00::/8, 100::/64, 64:ff9b:1::/48, …
  if (w[0] === 0x2001 && w[1] === 0) return true; // Teredo
  if (w[0] === 0x2001 && w[1] === 0xdb8) return true; // documentation
  if (w[0] === 0x2001 && (w[1] & 0xffe0) === 0x0020) return true; // ORCHIDv2 2001:20::/28
  if (w[0] === 0x2001 && (w[1] & 0xfff0) === 0x0010) return true; // ORCHID 2001:10::/28
  if (w[0] === 0x2002) return v4Blocked(embedded(w[1], w[2])); // 6to4
  return false;
}

// Loopback or unspecified, in any spelling a URL's host can take (SA-013):
// `localhost`, `*.localhost`, either with a trailing dot, and IPv4, IPv6,
// IPv4-mapped and IPv4-compatible literals of 127/8, 0/8, ::1 and ::.
export function isLoopbackHost(hostname) {
  const h = String(hostname).toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  const four = ipv4(h);
  if (four) return four[0] === 127 || four[0] === 0;
  const w = ipv6Words(h);
  if (!w) return false;
  const zeros = (n) => w.slice(0, n).every((x) => x === 0);
  if (zeros(5) && w[5] === 0xffff) return [127, 0].includes(w[6] >> 8);
  if (zeros(4) && w[4] === 0xffff && w[5] === 0) return [127, 0].includes(w[6] >> 8);
  if (zeros(6)) return w[6] === 0 || [127, 0].includes(w[6] >> 8); // ::, ::1, ::a.b.c.d
  return false;
}

// Link-local, where cloud metadata services live (169.254.169.254,
// fd00:ec2::254 is unique-local and allowed as an origin only if listed):
// never a capture origin.
export function isLinkLocalHost(hostname) {
  const h = String(hostname).toLowerCase().replace(/\.$/, "");
  const four = ipv4(h);
  if (four) return four[0] === 169 && four[1] === 254;
  const w = ipv6Words(h);
  if (!w) return false;
  if (w.slice(0, 5).every((x) => x === 0) && w[5] === 0xffff) return w[6] >> 8 === 169 && (w[6] & 255) === 254;
  return (w[0] & 0xffc0) === 0xfe80;
}
