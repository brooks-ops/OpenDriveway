import { supabase } from "./supabase";
import { demoHeaders, isLocalDemoMode } from "./demoAuth";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  if (isLocalDemoMode) {
    return demoHeaders();
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}
