const uuidPattern =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const contactRequestKeyPattern = new RegExp(
  `^contact-requests/\\d{13}-${uuidPattern}\\.json$`,
  "i",
);
const tripPdfKeyPattern = new RegExp(
  `^trip-pdfs/\\d{13}-${uuidPattern}\\.pdf$`,
  "i",
);

export const orphanPdfGracePeriodMs = 24 * 60 * 60 * 1000;

export function isContactRequestKey(value: unknown): value is string {
  return typeof value === "string" && contactRequestKeyPattern.test(value);
}

export function isTripPdfKey(value: unknown): value is string {
  return typeof value === "string" && tripPdfKeyPattern.test(value);
}

export function tripPdfKeyFromDocumentUrl(value: string) {
  if (!value.startsWith("/api/trip-pdf?")) return null;

  try {
    const url = new URL(value, "https://found-travel.invalid");
    if (url.pathname !== "/api/trip-pdf") return null;
    const key = url.searchParams.get("key");
    return isTripPdfKey(key) ? key : null;
  } catch {
    return null;
  }
}

export type OrphanedTripPdfDecision = "ignore" | "delete" | "protect-recent";

export function orphanedTripPdfDecision({
  key,
  lastModified,
  referencedKeys,
  immediatelyRemoveKeys,
  now,
}: {
  key: unknown;
  lastModified: Date | undefined;
  referencedKeys: ReadonlySet<string>;
  immediatelyRemoveKeys: ReadonlySet<string>;
  now: number;
}): OrphanedTripPdfDecision {
  if (!isTripPdfKey(key) || referencedKeys.has(key)) return "ignore";
  if (immediatelyRemoveKeys.has(key)) return "delete";

  if (
    lastModified instanceof Date &&
    now - lastModified.getTime() >= orphanPdfGracePeriodMs
  ) {
    return "delete";
  }

  return "protect-recent";
}
