import { createHash, randomUUID } from "node:crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function hashInput(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function previewInput(input: string, length = 180) {
  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}...` : normalized;
}
