import assert from "node:assert/strict";
import test from "node:test";
import type { AgroDataNormalized } from "@agrodatos/shared-types";
import { validateAgroData } from "../src/etl/validate.ts";

function row(
  overrides: Partial<AgroDataNormalized> = {},
): AgroDataNormalized {
  return {
    municipioId: 76001,
    municipioNombre: "Cali",
    cultivo: "Acelga",
    anio: 2019,
    periodo: "2019A",
    areaSembrada: 10,
    areaCosechada: 8,
    produccion: 40,
    rendimiento: 5,
    ...overrides,
  };
}

test("acepta un registro válido", () => {
  const result = validateAgroData([row()]);

  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.deepEqual(result.fatalErrors, []);
});

test("rechaza areaCosechada mayor que areaSembrada", () => {
  const result = validateAgroData([row({ areaCosechada: 12 })]);

  assert.equal(
    result.rejected[0].reasons.includes(
      "area_cosechada_mayor_que_area_sembrada",
    ),
    true,
  );
});

test("rechaza valores negativos", () => {
  const result = validateAgroData([row({ produccion: -1 })]);

  assert.equal(
    result.rejected[0].reasons.includes("valores_negativos"),
    true,
  );
});

test("rechaza año fuera de rango", () => {
  const result = validateAgroData([row({ anio: 2006 })]);

  assert.equal(
    result.rejected[0].reasons.includes("anio_fuera_de_rango"),
    true,
  );
});

test("rechaza municipio inválido", () => {
  const result = validateAgroData([row({ municipioId: 5001 })]);

  assert.equal(
    result.rejected[0].reasons.includes("municipio_id_invalido"),
    true,
  );
});

test("rechaza nombre o cultivo vacíos", () => {
  const result = validateAgroData([
    row({ municipioNombre: "  ", cultivo: "" }),
  ]);

  assert.equal(
    result.rejected[0].reasons.includes("municipio_nombre_vacio"),
    true,
  );
  assert.equal(result.rejected[0].reasons.includes("cultivo_vacio"), true);
});

test("rechaza área sembrada atípica", () => {
  const result = validateAgroData([row({ areaSembrada: 200_000 })]);

  assert.equal(
    result.rejected[0].reasons.includes("area_sembrada_atipica"),
    true,
  );
});

test("marca fatal la entrada vacía", () => {
  const result = validateAgroData([]);

  assert.equal(result.accepted.length, 0);
  assert.equal(
    result.fatalErrors.includes("No se extrajeron registros."),
    true,
  );
});

test("marca fatal una tasa de rechazo superior al umbral", () => {
  const result = validateAgroData([row(), row({ produccion: -1 })]);

  assert.equal(result.rejected.length, 1);
  assert.equal(
    result.fatalErrors.some((error) => error.includes("Tasa de rechazo")),
    true,
  );
});

test("marca fatal una estructura inválida", () => {
  const invalid = {
    ...row(),
    cultivo: undefined,
  } as unknown as AgroDataNormalized;
  const result = validateAgroData([invalid]);

  assert.equal(
    result.rejected[0].reasons.includes("estructura_invalida"),
    true,
  );
  assert.equal(
    result.fatalErrors.some((error) => error.includes("Estructura inválida")),
    true,
  );
});

test("el reporte es serializable", () => {
  const result = validateAgroData([row()]);

  assert.doesNotThrow(() => JSON.stringify(result.report));
});
