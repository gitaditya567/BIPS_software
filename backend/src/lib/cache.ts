const cache: Map<string, { data: any; expiresAt: number }> = new Map();

export function getCache(key: string): any | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

export function setCache(key: string, data: any, ttlMs = 30_000) {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(prefix: string) {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
}

export function clearAllCache() {
    cache.clear();
}
