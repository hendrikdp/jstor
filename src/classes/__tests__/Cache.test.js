import Cache from '../Cache.js';

describe('Test caching implementation', () => {

    const cacheData = {foo: 'bar'};

    describe('When a max age is set in the constructor, and not on the cache entry', function () {

        const cache = new Cache({maxAge: 2});

        test('Then cacheUntil should be calculated depending on the constructor maxAge ', () => {
            const cacheEntry = cache.setKey('test1', cacheData);
            const timeInCache = cacheEntry.cachedUntil - cacheEntry.cachedOn;
            expect(timeInCache).toBe(cache._globalOptions.maxAge * 1000);
        })

        test('Then maxAge on the setCache call has priority', () => {
            const cacheEntry = cache.setKey('test2', cacheData, {maxAge: 60});
            const timeInCache = cacheEntry.cachedUntil - cacheEntry.cachedOn;
            expect(timeInCache).toBe(60 * 1000);
        })

    });

    describe('When a max age is not set by the constructor', () => {

        const cache = new Cache();

        test('Item should get cached forever no expiry can be determined', () => {
            cache.setKey('test1', cacheData);
            const result = cache.getKey('test1');
            expect(result).toBe(cacheData);
        })

        test('Item should get cached for the amount of seconds in the setKey method', () => {
            const cacheEntry = cache.setKey('test2', cacheData, {maxAge: 2});
            const timeInCache = cacheEntry.cachedUntil - cacheEntry.cachedOn;
            expect(timeInCache).toBe(2 * 1000);
        })

    });

    describe('When getting an element', () => {

        const cache = new Cache();

        test('Check if the element remains in memory for the provided amount of seconds', done => {
            cache.setKey('test2', cacheData, {maxAge: 1});
            const result = cache.getKey('test2');
            expect(result).toBe(cacheData);
            setTimeout(()=>{
                expect(cache.getKey('test2')).toBeFalsy();
                done();
            } , 1000)
        });

    });

})

