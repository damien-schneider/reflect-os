/**
 * Zero Database Provider
 *
 * Creates a ZQLDatabase instance for server-side Zero operations.
 * Uses node-postgres adapter for compatibility with the existing dbPool.
 */

import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { schema } from "../../../../web/src/zero-schema";
import { dbPool } from "../../auth";

// Create the database provider for Zero server-side operations
export const dbProvider = zeroNodePg(schema, dbPool);

// Register the database provider for type safety
declare module "@rocicorp/zero" {
  interface DefaultTypes {
    dbProvider: typeof dbProvider;
  }
}
