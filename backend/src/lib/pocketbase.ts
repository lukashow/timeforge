import PocketBase from "pocketbase";
import { config } from "@/config/env.ts";
import type { Collections, CollectionName } from "@/types/pocketbase.d.ts";

/**
 * Type-safe PocketBase client singleton
 */
class TypedPocketBase extends PocketBase {
  /**
   * Get a typed collection by name
   */
  typedCollection<T extends CollectionName>(name: T) {
    return this.collection(name);
  }
}

// Singleton instance
export const pb = new TypedPocketBase(config.pocketbaseUrl);

// Re-export types for convenience
export type { Collections, CollectionName };

// Helper to check if PocketBase is healthy
export async function checkPocketBaseHealth(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}
