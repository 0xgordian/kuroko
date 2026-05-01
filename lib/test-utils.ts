// Test utilities that don't break the build
let testCache: { data: unknown[]; timestamp: number } | null = null;

export function getTestCache() {
  return testCache;
}

export function setTestCache(data: { data: unknown[]; timestamp: number } | null) {
  testCache = data;
}