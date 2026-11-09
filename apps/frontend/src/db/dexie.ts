import type {
  CompressedAgroPayload,
  VersionMetadata,
} from "@agrodatos/shared-types";
import Dexie, { type Table } from "dexie";

export interface CachedVersion extends VersionMetadata {
  fetched_at: string;
}

export interface CachedPayload {
  version_id: string;
  payload: CompressedAgroPayload;
}

class AgroDatosDatabase extends Dexie {
  versions!: Table<CachedVersion, string>;
  payloads!: Table<CachedPayload, string>;

  constructor() {
    super("agrodatos");
    this.version(1).stores({
      versions: "version_id, hash, schema_version, fetched_at",
      payloads: "version_id",
    });
  }
}

export const db = new AgroDatosDatabase();
