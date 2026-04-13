const BASE_URL = "https://finnhub.io/api/v1";

export async function finnhubFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
