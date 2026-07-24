// API Configuration for Hanova AI
// This allows you to set a custom backend base URL when deploying on Vercel or other frontend-only hosts.
// If VITE_API_URL is configured (e.g., https://your-backend.com), it will point there.
// Otherwise, it defaults to relative paths, which uses the same server host.
const rawApiUrl = ((import.meta as any).env?.VITE_API_URL || '').trim();

// Safely validate VITE_API_URL: must be a valid URL (http/https) or an absolute path (/)
// It should not look like an API key (like standard Google API keys that start with "AIzaSy")
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('AIzaSy') || url.length > 100) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
};

export const API_BASE_URL: string = isValidUrl(rawApiUrl) ? rawApiUrl : '';

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  // Real full-stack HTTP request to the running custom backend server
  return fetch(url, options);
}
