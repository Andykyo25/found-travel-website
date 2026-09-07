// Shared by the editor, public pages and API. Legacy notes remain visible.
export function parseDepartureDate(value: string) {
  const match = value
    .trim()
    .match(
      /^(?:(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})|(\d{4})(\d{2})(\d{2}))(?:\s*([（(][^）)]*[）)]))?$/,
    );
  if (!match) return null;
  const year = Number(match[1] ?? match[4]);
  const month = Number(match[2] ?? match[5]);
  const day = Number(match[3] ?? match[6]);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return { year, month, day, time, note: match[7] ?? "" };
}

export function formatDepartureDate(value: string) {
  const parsed = parseDepartureDate(value);
  if (!parsed) return value;
  return `${parsed.year}/${String(parsed.month).padStart(2, "0")}/${String(parsed.day).padStart(2, "0")}${parsed.note}`;
}

export function taipeiTodayTime(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );
}

export function upcomingDepartures<T extends { date: string }>(
  departures: T[],
  today = taipeiTodayTime(),
) {
  return departures
    .filter((item) => {
      const parsed = parseDepartureDate(item.date);
      return parsed !== null && parsed.time >= today;
    })
    .sort(
      (a, b) =>
        parseDepartureDate(a.date)!.time - parseDepartureDate(b.date)!.time,
    );
}

// Parse the amount only; numbers in notes such as “228連假” are not prices.
export function priceValue(value: string) {
  const match = value
    .trim()
    .match(
      /^(?:NT\$|TWD|\$)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?=\s|起|元|\/|／|[（(]|$)/i,
    );
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export function formatPrice(value: string, from = false) {
  const amount = priceValue(value);
  if (amount === null) return value.trim() || "價格洽詢";
  // Preserve ranges and custom pricing terms instead of silently discarding them.
  if (
    !/^(?:NT\$|TWD|\$)?\s*[\d,]+\s*(?:起)?\s*(?:元)?\s*(?:[／/]人)?\s*(?:[（(][^）)]*[）)])?\s*$/i.test(
      value.trim(),
    )
  )
    return value.trim();
  const note = value.match(/[（(][^）)]*[）)]/)?.[0] ?? "";
  return `NT$${amount.toLocaleString("en-US")}${from || value.includes("起") ? " 起" : ""}／人${note ? ` ${note}` : ""}`;
}
