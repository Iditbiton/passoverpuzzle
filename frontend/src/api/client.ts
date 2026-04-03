const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEY = "seder-order-token";

export function persistToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.detail && Array.isArray(data.detail)
        ? data.detail
            .map((item: unknown) => {
              if (typeof item === "string") {
                return item;
              }
              if (
                item &&
                typeof item === "object" &&
                "msg" in item &&
                typeof item.msg === "string"
              ) {
                return item.msg;
              }
              return "שגיאת ולידציה בבקשה.";
            })
            .join(", ")
        : data?.detail || "אירעה שגיאה בבקשה לשרת.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}
