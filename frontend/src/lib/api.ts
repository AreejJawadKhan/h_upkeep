import type { ApiErrorShape } from './types';

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const DEFAULT_PROD_API_BASE = 'https://api.hupkeep.areejjkhan.tech';

export const API_BASE = rawApiUrl?.replace(/\/$/, '') ?? (
  import.meta.env.DEV ? 'http://localhost:8000' : DEFAULT_PROD_API_BASE
);

export class ApiError extends Error {
  status: number;
  payload: ApiErrorShape | null;

  constructor(message: string, status: number, payload: ApiErrorShape | null = null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

function isJsonResponse(headers: Headers) {
  return headers.get('content-type')?.includes('application/json');
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body:
      options.body === undefined || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body),
  });

  const raw = await response.text();
  const payload = raw && isJsonResponse(response.headers) ? JSON.parse(raw) : raw;

  if (!response.ok) {
    const shape = typeof payload === 'object' && payload !== null ? (payload as ApiErrorShape) : null;
    const message =
      (shape?.detail as string | undefined) ??
      (shape?.message as string | undefined) ??
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, shape);
  }

  if (response.status === 204 || raw.length === 0) {
    return undefined as T;
  }

  return payload as T;
}

export async function apiRequestWithRefresh<T>(
  path: string,
  options: RequestOptions = {},
  getToken: () => string | null,
  refreshToken: () => Promise<string | null>,
): Promise<T> {
  try {
    return await apiRequest<T>(path, options, getToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshedToken = await refreshToken();
      if (refreshedToken) {
        return apiRequest<T>(path, options, refreshedToken);
      }
    }
    throw error;
  }
}
