import assert from "node:assert/strict";
import test from "node:test";
import { defaultHeroImages, normalizeHeroImages } from "../lib/hero-slides.ts";

test("old homepage settings retain their cover and gain sample slides", () => {
  assert.deepEqual(normalizeHeroImages(undefined, "/old-cover.jpg"), ["/old-cover.jpg", ...defaultHeroImages]);
  assert.deepEqual(normalizeHeroImages(undefined), defaultHeroImages);
});
test("explicit empty and single-slide selections survive saving", () => {
  assert.deepEqual(normalizeHeroImages([], "/old-cover.jpg"), []);
  assert.deepEqual(normalizeHeroImages(["/new.jpg"]), ["/new.jpg"]);
});
test("slide settings reject invalid sources, deduplicate and limit count", () => {
  assert.deepEqual(normalizeHeroImages([null, "javascript:alert(1)", "//bad.test", "/a.jpg", " /a.jpg ", "https://images.unsplash.com/photo-a"]), ["/a.jpg", "https://images.unsplash.com/photo-a"]);
  assert.equal(normalizeHeroImages(Array.from({length: 10}, (_, i) => `/photo-${i}.jpg`)).length, 8);
});
