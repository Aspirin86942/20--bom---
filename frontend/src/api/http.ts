export type RequestJsonError = Error & {
  status?: number;
  code?: string;
  retryable?: boolean;
};


export async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  console.log("[http] 发起请求:", input, init?.method || "GET");

  const response = await fetch(input, init);
  console.log("[http] 响应状态:", response.status, response.statusText);

  if (!response.ok) {
    const error: RequestJsonError = new Error("请求失败");
    error.status = response.status;
    error.code = "REQUEST_FAILED";
    error.retryable = response.status >= 500;

    try {
      const payload = (await response.json()) as {
        detail?: string | { code?: string; message?: string; retryable?: boolean };
      };
      const detail = payload.detail;

      if (typeof detail === "string") {
        error.message = `Request failed: ${response.status} - ${detail}`;
      } else if (detail && typeof detail === "object") {
        error.message = detail.message ?? `Request failed: ${response.status}`;
        error.code = detail.code ?? error.code;
        if (typeof detail.retryable === "boolean") {
          error.retryable = detail.retryable;
        }
      } else {
        error.message = `Request failed: ${response.status}`;
      }
    } catch {
      const errorText = await response.text();
      error.message = `Request failed: ${response.status} - ${errorText}`;
    }

    console.error("[http] 请求失败:", response.status, error.message);
    throw error;
  }

  const data = (await response.json()) as T;
  console.log("[http] 响应数据:", data);

  return data;
}
