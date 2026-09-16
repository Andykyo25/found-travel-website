export const defaultHeroImages = [
  "https://images.unsplash.com/photo-1729605411729-b48129161e68?auto=format&fit=crop&w=1920&h=1080&q=85",
  "https://images.unsplash.com/photo-1765707886539-6d57024ddc2f?auto=format&fit=crop&w=1920&h=1080&q=85",
  "https://images.unsplash.com/photo-1745354874371-39ae303cdd26?auto=format&fit=crop&w=1920&h=1080&q=85",
];

export function isHeroImageUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function normalizeHeroImages(value: unknown, legacyImage = "") {
  if (!Array.isArray(value)) return legacyImage ? [legacyImage, ...defaultHeroImages] : [...defaultHeroImages];
  return [...new Set(value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 800)).filter(isHeroImageUrl))].slice(0, 8);
}

