export const AUCTION_API_BASE = import.meta.env.VITE_AUCTION_API_URL;
export const XI_API_BASE = import.meta.env.VITE_XI_API_URL;

export async function auctionGet(path: string) {
  const res = await fetch(`${AUCTION_API_BASE}${path}`);
  return res.json();
}

export async function xiPost(path: string, body: any) {
  const res = await fetch(`${XI_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
