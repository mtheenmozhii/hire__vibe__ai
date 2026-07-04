import { createClient } from "@supabase/supabase-js";

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (str: string | undefined): boolean => {
  if (!str) return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : "https://placeholder-project.supabase.co";
const supabaseAnonKey = rawKey && rawKey !== "<YOUR_ANON_PUBLIC_KEY>" ? rawKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

if (!isValidUrl(rawUrl)) {
  console.warn("Supabase VITE_SUPABASE_URL is missing or invalid. Using a placeholder URL to prevent application crash.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

