import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "../src/lib/messages.js";
import { formatDisplayDate, localizedText } from "../src/lib/localization.js";

test("English and Bangla resources cover the same UI keys", () => {
  assert.deepEqual(Object.keys(messages.bn).sort(), Object.keys(messages.en).sort());
  for (const [key, value] of Object.entries(messages.en)) {
    assert.ok(value.trim(), `English translation missing for ${key}`);
    assert.ok(messages.bn[key as keyof typeof messages.bn].trim(), `Bangla translation missing for ${key}`);
  }
});

test("missing Bangla game copy uses an explicit English fallback", () => {
  assert.deepEqual(localizedText({ en: "A quick game" }, "bn"), {
    text: "A quick game",
    fallback: true,
  });
  assert.deepEqual(localizedText({ en: "একটি খেলা", bn: "একটি খেলা" }, "bn"), {
    text: "একটি খেলা",
    fallback: false,
  });
});

test("formatDisplayDate handles valid and invalid ISO timestamps safely", () => {
  assert.equal(formatDisplayDate(null, "en"), "");
  assert.equal(formatDisplayDate("not-a-date", "en"), "");
  const formattedEn = formatDisplayDate("2026-11-11T10:00:00.000Z", "en");
  const formattedBn = formatDisplayDate("2026-11-11T10:00:00.000Z", "bn");
  assert.ok(formattedEn.includes("2026"));
  assert.ok(formattedBn.length > 0);
});
