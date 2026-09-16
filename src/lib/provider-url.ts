import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);

function isPrivateIpv4(address: string) {
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
}

export async function assertPublicProviderUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid server URL");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (blockedHostnames.has(hostname)) throw new Error("This server address is not allowed");
  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true })).map((entry) => entry.address);
  if (!addresses.length || addresses.some((address) => isPrivateIpv4(address) || isPrivateIpv6(address))) throw new Error("This server address is not allowed");
  return url.toString().replace(/\/$/, "");
}
