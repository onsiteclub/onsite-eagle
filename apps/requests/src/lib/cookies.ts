export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearSession() {
  document.cookie = "onsite-name=; path=/; max-age=0";
  document.cookie = "onsite-role=; path=/; max-age=0";
}
