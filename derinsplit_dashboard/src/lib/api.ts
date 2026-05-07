const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listSplits: (filter: 'open' | 'bottle_left' | 'closed' = 'open') =>
    request<any[]>(`/splits?filter=${filter}`),
  getSplit: (id: string) => request<any>(`/splits/${id}`),
  listListings: () => request<any[]>(`/listings`),
};
