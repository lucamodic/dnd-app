import { useAuth } from "@/store/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // por defecto true
}

/** Wrapper de fetch: agrega el token, parsea `{ data }` / `{ error }`. */
export async function api<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const token = useAuth.getState().token;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Si el token venció, deslogueamos.
    if (res.status === 401 && auth) useAuth.getState().logout();
    throw new ApiError(res.status, json.error || "Algo salió mal");
  }

  return json.data as T;
}

export { API_URL };
