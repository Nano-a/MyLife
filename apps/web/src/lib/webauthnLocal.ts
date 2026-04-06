/**
 * Passkeys / WebAuthn **sans serveur** : convenable pour déverrouillage local uniquement
 * (HTTPS requis en prod). Pas un remplacement PIN sécurisé côté serveur.
 */

function b64url(buf: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function registerLocalPasskey(): Promise<string | null> {
  if (!isWebAuthnAvailable()) return null;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "MyLife", id: window.location.hostname },
        user: {
          id: userId,
          name: "mylife-user",
          displayName: "MyLife",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        timeout: 120_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred?.rawId) return null;
    return b64url(cred.rawId);
  } catch {
    return null;
  }
}

export async function authenticateLocalPasskey(credentialIdsJson: string | undefined): Promise<boolean> {
  if (!credentialIdsJson || !isWebAuthnAvailable()) return false;
  let ids: string[];
  try {
    ids = JSON.parse(credentialIdsJson) as string[];
  } catch {
    return false;
  }
  if (!Array.isArray(ids) || ids.length === 0) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const allowCredentials = ids.map((id) => ({
    type: "public-key" as const,
    id: b64urlToBuf(id),
  }));

  try {
    const assn = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: "preferred",
        timeout: 120_000,
      },
    });
    return !!assn;
  } catch {
    return false;
  }
}
