import { randomFillSync } from "node:crypto";
export function getRandomValues<T extends Uint8Array>(bytes: T): T {
  return randomFillSync(bytes);
}
