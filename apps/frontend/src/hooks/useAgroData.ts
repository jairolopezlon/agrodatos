import type {
  CompressedAgroPayload,
  VersionMetadata,
} from "@agrodatos/shared-types";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveVersion, fetchPayload } from "../api/client";
import { SUPPORTED_SCHEMA_VERSION } from "../constants";
import { db } from "../db/dexie";

export class UnsupportedSchemaVersionError extends Error {
  constructor(
    public readonly schemaVersion: number,
    public readonly supportedVersion: number,
  ) {
    super(
      `La versión de datos ${schemaVersion} no es compatible. Actualiza la aplicación (soporta ${supportedVersion}).`,
    );
    this.name = "UnsupportedSchemaVersionError";
  }
}

function assertSupportedSchemaVersion(version: VersionMetadata): void {
  if (version.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(
      version.schema_version,
      SUPPORTED_SCHEMA_VERSION,
    );
  }
}

async function getCachedActiveVersion(): Promise<VersionMetadata | null> {
  const cached = await db.versions.orderBy("fetched_at").last();

  if (!cached) {
    return null;
  }

  return {
    version_id: cached.version_id,
    created_at: cached.created_at,
    hash: cached.hash,
    total_records: cached.total_records,
    schema_version: cached.schema_version,
  };
}

async function loadActiveVersion(): Promise<VersionMetadata | null> {
  try {
    return await fetchActiveVersion();
  } catch (error) {
    const cached = await getCachedActiveVersion();

    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function pruneOldVersions(activeVersionId: string): Promise<void> {
  const versions = await db.versions.orderBy("fetched_at").toArray();
  const previous = versions
    .filter((version) => version.version_id !== activeVersionId)
    .at(-1);
  const keep = new Set<string>([activeVersionId]);

  if (previous) {
    keep.add(previous.version_id);
  }

  const remove = versions
    .filter((version) => !keep.has(version.version_id))
    .map((version) => version.version_id);

  if (remove.length === 0) {
    return;
  }

  await db.transaction("rw", db.versions, db.payloads, async () => {
    await db.versions.bulkDelete(remove);
    await db.payloads.bulkDelete(remove);
  });
}

async function loadPayload(
  version: VersionMetadata,
): Promise<CompressedAgroPayload> {
  assertSupportedSchemaVersion(version);

  const [cachedVersion, cachedPayload] = await Promise.all([
    db.versions.get(version.version_id),
    db.payloads.get(version.version_id),
  ]);

  if (
    cachedVersion &&
    cachedPayload &&
    cachedVersion.hash === version.hash &&
    cachedVersion.schema_version === version.schema_version
  ) {
    await pruneOldVersions(version.version_id);
    return cachedPayload.payload;
  }

  const payload = await fetchPayload(version.version_id);

  await db.transaction("rw", db.versions, db.payloads, async () => {
    await db.versions.put({
      ...version,
      fetched_at: new Date().toISOString(),
    });
    await db.payloads.put({ version_id: version.version_id, payload });
  });

  await pruneOldVersions(version.version_id);
  return payload;
}

export function useAgroData() {
  const versionQuery = useQuery({
    queryKey: ["agro-version"],
    queryFn: loadActiveVersion,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const activeVersion = versionQuery.data ?? null;

  const payloadQuery = useQuery({
    queryKey: [
      "agro-payload",
      activeVersion?.version_id,
      activeVersion?.hash,
      activeVersion?.schema_version,
    ],
    queryFn: () => {
      if (!activeVersion) {
        return null;
      }

      return loadPayload(activeVersion);
    },
    enabled: Boolean(activeVersion),
    staleTime: Infinity,
    retry: 1,
  });

  return {
    activeVersion,
    payload: payloadQuery.data ?? null,
    versionQuery,
    payloadQuery,
  };
}
