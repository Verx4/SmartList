export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message ?? "Não foi possível concluir a operação.";
    const issues = Array.isArray(detail?.issues)
      ? ` ${detail.issues.join(" ")}`
      : "";
    throw new Error(
      `${message}${issues}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
