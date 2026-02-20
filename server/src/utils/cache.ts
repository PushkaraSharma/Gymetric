import NodeCache from 'node-cache';

// Standard cache with an default TTL of 5 minutes (300 seconds)
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Helper function to generate cache keys
export const getCacheKey = (prefix: string, gymId: string) => `${prefix}_${gymId}`;

/**
 * Standard Cache Prefixes:
 * - 'dashboard_summary'
 * - 'client_list'
 */
