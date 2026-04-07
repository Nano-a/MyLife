const SALT = "mylife-pin-v1";

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(SALT + pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const h = await hashPin(pin);
  return h === hash;
}
