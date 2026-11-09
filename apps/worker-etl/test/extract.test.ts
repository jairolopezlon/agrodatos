import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptCurrent,
  adaptHistorical,
  fetchSocrataPaginated,
  toNumber,
} from "../src/etl/extract.ts";

test("toNumber convierte números y cadenas", () => {
  assert.equal(toNumber(12.5), 12.5);
  assert.equal(toNumber("12.5"), 12.5);
  assert.equal(toNumber("1,5"), 1.5);
  assert.equal(toNumber("1.234,56"), 1234.56);
  assert.equal(toNumber("1,234.56"), 1234.56);
  assert.equal(toNumber(""), 0);
  assert.equal(toNumber("N/A"), 0);
  assert.equal(toNumber(null), 0);
  assert.equal(toNumber(undefined), 0);
  assert.equal(toNumber(Number.NaN), 0);
});

test("adaptHistorical mapea la fuente histórica", () => {
  assert.deepEqual(
    adaptHistorical({
      c_d_mun: "76563",
      municipio: "PRADERA",
      cultivo: "ACELGA",
      a_o: "2009",
      periodo: "2009A",
      rea_sembrada_ha: "8",
      rea_cosechada_ha: "8",
      producci_n_t: "16",
      rendimiento_t_ha: "2.00",
    }),
    {
      municipioId: 76563,
      municipioNombre: "PRADERA",
      cultivo: "ACELGA",
      anio: 2009,
      periodo: "2009A",
      areaSembrada: 8,
      areaCosechada: 8,
      produccion: 16,
      rendimiento: 2,
    },
  );
});

test("adaptCurrent mapea la fuente vigente", () => {
  assert.deepEqual(
    adaptCurrent({
      c_digo_dane_municipio: "76001",
      municipio: "Santiago de Cali",
      cultivo: "Acelga",
      a_o: "2019",
      periodo: "2019B",
      rea_sembrada: "4.00",
      rea_cosechada: "4.00",
      producci_n: "16.00",
      rendimiento: "4.00",
    }),
    {
      municipioId: 76001,
      municipioNombre: "Santiago de Cali",
      cultivo: "Acelga",
      anio: 2019,
      periodo: "2019B",
      areaSembrada: 4,
      areaCosechada: 4,
      produccion: 16,
      rendimiento: 4,
    },
  );
});

test("fetchSocrataPaginated pagina hasta la última página", async () => {
  const rows = await fetchSocrataPaginated<{ id: number }>(
    "test",
    { c_d_dep: "76" },
    {
      pageSize: 2,
      maxRetries: 0,
      timeoutMs: 1000,
      fetcher: async (input) => {
        const url = new URL(input as string);
        const offset = Number(url.searchParams.get("$offset"));
        const page =
          offset === 0
            ? [{ id: 1 }, { id: 2 }]
            : offset === 2
              ? [{ id: 3 }]
              : [];

        return new Response(JSON.stringify(page), { status: 200 });
      },
    },
  );

  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }, { id: 3 }]);
});

test("fetchSocrataPaginated reintenta 5xx", async () => {
  let attempts = 0;

  const rows = await fetchSocrataPaginated<{ ok: boolean }>(
    "test",
    {},
    {
      pageSize: 2,
      maxRetries: 2,
      timeoutMs: 1000,
      fetcher: async () => {
        attempts += 1;

        if (attempts < 3) {
          return new Response("busy", { status: 500 });
        }

        return new Response(JSON.stringify([{ ok: true }]), { status: 200 });
      },
    },
  );

  assert.equal(attempts, 3);
  assert.deepEqual(rows, [{ ok: true }]);
});

test("fetchSocrataPaginated falla con JSON no-array", async () => {
  await assert.rejects(
    fetchSocrataPaginated("test", {}, {
      pageSize: 2,
      maxRetries: 0,
      timeoutMs: 1000,
      fetcher: async () =>
        new Response(JSON.stringify({ nope: true }), { status: 200 }),
    }),
    /non-array/,
  );
});

test("fetchSocrataPaginated falla con 404 descriptivo", async () => {
  await assert.rejects(
    fetchSocrataPaginated("test", {}, {
      pageSize: 2,
      maxRetries: 0,
      timeoutMs: 1000,
      fetcher: async () =>
        new Response("nope", { status: 404, statusText: "Not Found" }),
    }),
    /404 Not Found/,
  );
});
