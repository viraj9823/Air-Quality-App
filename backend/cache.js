class Cache {
    constructor(expiryMinutes = 30, maxEntries = 100) {
        this.cache = new Map();
        this.expiryMinutes = expiryMinutes;
        this.maxEntries = maxEntries;
    }

    set(key, data) {
        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) return null;

        // Check if cache has expired
        const isExpired = (Date.now() - item.timestamp) > (this.expiryMinutes * 60 * 1000);
        
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

module.exports = Cache;