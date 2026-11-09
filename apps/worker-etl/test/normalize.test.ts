import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseLabel,
  normalizeKey,
  normalizeLabel,
} from "../src/etl/normalize.ts";

test("normalizeKey quita tildes y conserva la Ñ", () => {
  assert.equal(normalizeKey("Café"), "CAFE");
  assert.equal(normalizeKey("  maíz  "), "MAIZ");
  assert.equal(normalizeKey("Ñame"), "ÑAME");
});

test("normalizeLabel mantiene tildes y mayúsculas", () => {
  assert.equal(normalizeLabel("  tomate   de árbol "), "TOMATE DE ÁRBOL");
});

test("chooseLabel prefiere la variante con tilde", () => {
  const label = chooseLabel(
    new Map([
      ["CAFE", 468],
      ["Café", 273],
    ]),
  );

  assert.equal(label, "CAFÉ");
});

test("chooseLabel usa la variante más frecuente si no hay tildes", () => {
  const label = chooseLabel(
    new Map([
      ["REPOLLO", 310],
      ["Repollo", 156],
    ]),
  );

  assert.equal(label, "REPOLLO");
});
