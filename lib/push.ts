import webpush from "web-push";

let configured = false;

/**
 * Lazily-configured web-push client. Returns null when VAPID keys aren't set
 * so push features fail soft in environments without them.
 */
export function getWebPush(): typeof webpush | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  if (!configured) {
    webpush.setVapidDetails("mailto:barel57000@gmail.com", publicKey, privateKey);
    configured = true;
  }
  return webpush;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};
