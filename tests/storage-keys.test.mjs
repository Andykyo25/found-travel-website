import assert from "node:assert/strict";
import test from "node:test";
import {
  isContactRequestKey,
  isTripPdfKey,
  orphanedTripPdfDecision,
  orphanPdfGracePeriodMs,
  tripPdfKeyFromDocumentUrl,
} from "../lib/storage-keys.ts";

const uuid = "123e4567-e89b-12d3-a456-426614174000";
const contactKey = `contact-requests/1760000000000-${uuid}.json`;
const pdfKey = `trip-pdfs/1760000000000-${uuid}.pdf`;

test("storage keys accept only generated contact and PDF object paths", () => {
  assert.equal(isContactRequestKey(contactKey), true);
  assert.equal(isTripPdfKey(pdfKey), true);

  for (const value of [
    "contact-requests/../../content/site-content.json",
    `other/1760000000000-${uuid}.json`,
    `trip-pdfs/1760000000000-${uuid}.html`,
    "trip-pdfs/not-a-uuid.pdf",
  ]) {
    assert.equal(isContactRequestKey(value), false);
    assert.equal(isTripPdfKey(value), false);
  }
});

test("PDF document URLs expose only validated trip PDF keys", () => {
  assert.equal(
    tripPdfKeyFromDocumentUrl(
      `/api/trip-pdf?key=${encodeURIComponent(pdfKey)}`,
    ),
    pdfKey,
  );
  assert.equal(
    tripPdfKeyFromDocumentUrl("/api/trip-pdf?key=trip-pdfs%2F..%2Fsecret.pdf"),
    null,
  );
  assert.equal(
    tripPdfKeyFromDocumentUrl(`https://example.com/api/trip-pdf?key=${pdfKey}`),
    null,
  );
});

test("orphan PDF cleanup protects references and recent unpublished uploads", () => {
  const now = Date.parse("2026-08-05T12:00:00.000Z");
  const referencedKeys = new Set([pdfKey]);

  assert.equal(
    orphanedTripPdfDecision({
      key: pdfKey,
      lastModified: new Date(now - orphanPdfGracePeriodMs * 2),
      referencedKeys,
      immediatelyRemoveKeys: new Set(),
      now,
    }),
    "ignore",
  );

  const recentPdfKey = `trip-pdfs/1760000000001-${uuid}.pdf`;
  assert.equal(
    orphanedTripPdfDecision({
      key: recentPdfKey,
      lastModified: new Date(now - 60_000),
      referencedKeys,
      immediatelyRemoveKeys: new Set(),
      now,
    }),
    "protect-recent",
  );
  assert.equal(
    orphanedTripPdfDecision({
      key: recentPdfKey,
      lastModified: new Date(now - 60_000),
      referencedKeys,
      immediatelyRemoveKeys: new Set([recentPdfKey]),
      now,
    }),
    "delete",
  );

  const stalePdfKey = `trip-pdfs/1760000000002-${uuid}.pdf`;
  assert.equal(
    orphanedTripPdfDecision({
      key: stalePdfKey,
      lastModified: new Date(now - orphanPdfGracePeriodMs),
      referencedKeys,
      immediatelyRemoveKeys: new Set(),
      now,
    }),
    "delete",
  );
});
