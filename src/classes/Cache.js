export default class{

    constructor(options = {}) {
        this.clear();
        this._globalOptions = options;
        const garbageCollectionInterval = options.garbageCollectionInterval || 120;
        setInterval(this.garbageCollection, garbageCollectionInterval * 1000);
    }

    garbageCollection(){
        Object.keys(this._cache).forEach(key => {
            if(this.isExpired(this._cache[key])) delete this._cache[key];
        });
    }

    getKey(key) {
        const cacheEntry = this._cache[key];
        const hasValidCacheEntry = cacheEntry && !this.isExpired(cacheEntry);
        return hasValidCacheEntry ? cacheEntry.cacheable : null;
    }

    setKey(key, cacheable, options = {}) {
        const maxAge = this.getMaxAge(options);
        if(maxAge < 0){
            return {cacheable};
        }else{
            const now = Date.now();
            const expiryDate = this.getExpiryDate(now, options);
            return this._cache[key] = {
                cachedOn: now,
                cachedUntil: expiryDate,
                cacheable
            }
        }
    }

    clear(){
        this._cache = {};
    }

    remove(key){
        return delete this._cache[key];
    }

    isExpired(cacheEntry){
        const cacheUntil = cacheEntry.cachedUntil;
        return cacheUntil === null ? false : (cacheUntil < Date.now());
    }

    getExpiryDate(now, maxAge){
        return maxAge > 0 ? (now + (maxAge * 1000)) : null;
    }

    getMaxAge(options = {}){
        return options.maxAge || this._globalOptions.maxAge || 0;
    }

}