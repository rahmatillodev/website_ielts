/**
 * Build a URL suitable for <iframe src>. YouTube watch/shorts/you.tu.be → embed URL; embed URLs get autoplay params; other URLs pass through.
 */
export function toIframeSrc(urlOrEmpty) {
  if (!urlOrEmpty || typeof urlOrEmpty !== "string") return "";
  const s = urlOrEmpty.trim();
  if (!s) return "";
  if (s.includes("youtube.com/embed/") || s.includes("youtu.be/embed")) {
    return s.includes("?") ? s : `${s}?autoplay=1&rel=0&modestbranding=1&fs=1`;
  }
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id
        ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&fs=1`
        : "";
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) {
        return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0&modestbranding=1&fs=1`;
      }
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) {
        return `https://www.youtube.com/embed/${embed[1]}?autoplay=1&rel=0&modestbranding=1&fs=1`;
      }
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) {
        return `https://www.youtube.com/embed/${shorts[1]}?autoplay=1&rel=0&modestbranding=1&fs=1`;
      }
    }
  } catch {
    /* fall through */
  }
  if (/^[a-zA-Z0-9_-]{6,32}$/.test(s) && !s.includes("/")) {
    return `https://www.youtube.com/embed/${s}?autoplay=1&rel=0&modestbranding=1&fs=1`;
  }
  return s;
}
