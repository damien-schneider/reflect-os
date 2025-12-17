/**
 * Polar Client
 *
 * Creates and manages the Polar SDK client instance.
 */

import { Polar } from "@polar-sh/sdk";
import type { PolarConfig } from "./config";

let polarClientInstance: Polar | null = null;

/**
 * Creates a Polar client instance from config.
 * Returns null if Polar is disabled.
 */
export const createPolarClient = (config: PolarConfig): Polar | null => {
  if (!(config.enabled && config.accessToken)) {
    return null;
  }

  return new Polar({
    accessToken: config.accessToken,
    server: config.environment === "production" ? "production" : "sandbox",
  });
};

/**
 * Gets the singleton Polar client instance.
 * Must call initializePolarClient first.
 */
export const getPolarClient = (): Polar | null => polarClientInstance;

/**
 * Initializes the global Polar client instance.
 * Call this once at app startup.
 */
export const initializePolarClient = (config: PolarConfig): Polar | null => {
  polarClientInstance = createPolarClient(config);
  return polarClientInstance;
};

/**
 * Check if Polar is enabled and client is available.
 */
export const isPolarEnabled = (): boolean => polarClientInstance !== null;
