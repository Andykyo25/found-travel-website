import assert from "node:assert/strict";
import test from "node:test";
import { escapeCsvCell } from "../lib/csv.ts";

test("CSV cells quote regular text and embedded quotes", () => {
  assert.equal(escapeCsvCell("一般文字"), '"一般文字"');
  assert.equal(escapeCsvCell('他說"您好"'), '"他說""您好"""');
});

test("CSV cells neutralize spreadsheet formula prefixes", () => {
  for (const value of [
    "=1+1",
    "+886912345678",
    "-2+3",
    "@SUM(A1:A2)",
    " \t=HYPERLINK(\"https://example.com\")",
  ]) {
    assert.equal(escapeCsvCell(value), `"'${value.replace(/"/g, '""')}"`);
  }
});
