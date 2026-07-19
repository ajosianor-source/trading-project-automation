import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types";

export const api = axios.create({
  // All browser traffic is same-origin and passes through the BFF. Access tokens and
  // verified tenant claims never enter JavaScript or browser-controlled headers.
  baseURL: "/api/backend",
  timeout: 15_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] = crypto.randomUUID();
  config.headers["X-Purpose-Of-Use"] = "operations";
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // If we are already on the login page, do not redirect
      if (window.location.pathname === "/login") {
        return Promise.reject(error);
      }
      const destination = "/login?reason=session-expired";
      window.location.assign(destination);
      return Promise.reject({
        code: "SESSION_EXPIRED",
        message: "Your secure session expired. Reconnecting…",
      } satisfies ApiError);
    }
    const config = error.config as (InternalAxiosRequestConfig & { retryCount?: number }) | undefined;
    const retryable =
      config?.method?.toLowerCase() === "get" &&
      (!error.response || error.response.status === 429 || error.response.status >= 500);
    if (config && retryable && (config.retryCount ?? 0) < 2) {
      config.retryCount = (config.retryCount ?? 0) + 1;
      const retryAfter = Number(error.response?.headers["retry-after"]);
      const delay = Number.isFinite(retryAfter)
        ? retryAfter * 1_000
        : 400 * 2 ** config.retryCount + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }
    const responseData = error.response?.data as (ApiError & { detail?: string }) | undefined;
    const normalized: ApiError = {
      code: error.response?.data?.code ?? "REQUEST_FAILED",
      message: responseData?.message ?? responseData?.detail ?? "The request could not be completed.",
      requestId: error.response?.headers["x-request-id"],
    };
    return Promise.reject(normalized);
  },
);
