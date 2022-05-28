import fileStrategy from "../strategies/file.js";
import path from "path";
import Cache from "./Cache.js";
import File from "./File.js";
import { merge } from "lodash-es";

export default class {

    constructor(options = {}) {
        this.Cache = Cache;
        //options can be set in 3 ways
        //overrides all: passed to store the constructor
        //overrides default strategy: passed as arguments to the strategy
        //default strategy options: passed from the strategy to the store object
        this.options = {};
        this.initStrategy(options);
        this.setOptions(options);
        this.initCache()
    }

    /** Returns the caching options for either the key cache or the document cache
     * options can be
     * this.options.cacheOptions.keys = {maxAge: time in seconds}
     * this.options.cacheOptions.files = {maxAge: time in seconds}
     * @returns {*|{}}
     */
    get cacheOptions() {
        return this.options.cacheOptions || {};
    }

    get maxBatchSize() {
        return this.options.maxBatchSize || 50;
    }

    /** Returns the options set in the constructor
     *  options can be
     *  this.options.failOptions.get = "silent" || 'warning' || 'error'
     *  this.options.failOptions.save = "silent" || 'warning' || 'error'
     *  this.options.failOptions.keys = "silent" || 'warning' || 'error'
     *  this.options.failOptions.find = "silent" || 'warning' || 'error'
     *  ...
     *  this.options.failOptions.always = "silent" || 'warning' || 'error'
     * @returns {*|{}}
     */
    get failOptions() {
        return this.options.failOptions || {};
    }

    setOptions(options) {
        this.options = merge(this.options, options);
    }

    initStrategy(options) {
        const strategy = options.strategy || fileStrategy({
            filepath: path.join(process.cwd(), '.store')
        });
        this.strategy = strategy(this);
    }

    initCache() {
        this.fileCache = new Cache(this.cacheOptions.files);
        this.keysCache = new Cache(this.cacheOptions.keys);
    }

    /** migrates all documents from this store to another target-store
     * @param toStore target-store to move all documents to
     * @returns {Promise<*[]>}
     */
    async migrateTo(toStore) {
        //get all current documents
        const allDocs = await this.all();
        //migrate to a new database
        return Promise.all(
            allDocs.map(
                doc => toStore.save(doc.key, doc.json())
            )
        );
    }

    async keys(query) {
        try {
            const doc = await (this._fromCache(this.keysCache, 'ALL') ||
                this._toCache(this.keysCache, 'ALL', this.strategy.keys()));
            return doc;
        } catch (err) {
            return this._handleError(err, 'keys');
        }
    }

    async _updateKeyInKeysCache(key, method) {
        const keys = await this._fromCache(this.keysCache, 'ALL');
        if(keys && Array.isArray(keys)){
            const elementIndex = keys.indexOf(key);
            if(keys){
                if(elementIndex > -1 && method === 'remove'){
                    delete keys[elementIndex];
                    this._toCache(this.keysCache, 'ALL', keys.filter(e => e));
                }else if(elementIndex === -1) {
                    keys.push(key);
                    this._toCache(this.keysCache, 'ALL', keys);
                }
            }
        }
    }

    async get(key){
        try{
            const doc = await (this._fromCache(this.fileCache, key) ||
                this._toFileCacheReturnFile(key, this.strategy.get(key)));
            return doc;
        }catch(err){
            return this._handleError(err, 'get');
        }
    }

    async save(key, document){
        try{
            await this.strategy.save(key, document);
            await this._updateKeyInKeysCache(key);
            return this._toFileCacheReturnFile(key, document);
        }catch(err){
            return this._handleError(err, 'save');
        }
    }

    async remove(key){
        try{
            await this.strategy.remove(key);
            await this._updateKeyInKeysCache(key, 'remove');
            return this.fileCache.remove(key);
        }catch(err){
            return this._handleError(err, 'remove');
        }
    }

    /** get all documents from a collection...
     * either use the function provided in the storage strategy or use the keys! (if no function is provided)
     * @param start start-index from where documents have to be returned
     * @param n number of documents to return
     * @param reverse count in reverse order
     */
    async all(start, n, reverse){
        try{
            const fnGetAll = this.strategy.all;
            if(typeof fnGetAll === 'function'){
                return this._allFromAllStrategy(fnGetAll, start, n, reverse);
            }else{
                const keys = await this.keys();
                const sortedKeys = reverse ? keys.slice().reverse() : keys;
                const startIndex = start || 0;
                const targetKeys = (startIndex || n) ?
                    sortedKeys.slice(startIndex, (startIndex + n) || (sortedKeys.length - 1)) :
                    sortedKeys;
                return this.batch(targetKeys);
            }
        }catch(err){
            return this._handleError(err, 'all');
        }
    }

    async _allFromAllStrategy(fnGetAll, start, n, reverse){
        const results = await fnGetAll(start, n, reverse);
        return results instanceof Array ? results.map(
            result => result.key ? this._toFileCacheReturnFile(result.key, result.document) : result
        ) : null;
    }

    /**
     * Fetch a batch of keys
     * @param keys
     */
    async batch(keys){
        //check if the strategy has a batch method
        if(keys instanceof Array){
            const fnBatch = this.strategy.batch;
            if(typeof fnBatch === 'function'){
                const documentsByKey = {};
                //try to find documents in cache first
                const documentsAlreadyInCache = this._searchKeysInCache(keys);
                //split up the remaining ids into the right max chunk sizes
                const chunks = this._chunkArray(documentsAlreadyInCache.nonCachedKeys);
                const chunkedResults = await Promise.all(chunks.map(fnBatch));
                const cachedResults = await Promise.all(documentsAlreadyInCache.cacheRecords);
                chunkedResults.forEach(chunk => {
                    if(chunk instanceof Array){
                        chunk.forEach(result =>
                            documentsByKey[result.key] = this._toFileCacheReturnFile(result.key, result.document)
                        )
                    }
                });
                cachedResults.forEach(result => documentsByKey[result.key] = result)
                return keys.map(key => {
                    return documentsByKey[key] || this._toFileCacheReturnFile(key, null)
                });
            }else{
                return this._getKeysSeperately(keys);
            }
        }else{
            return [];
        }
    }

    /**
     * Find which keys are already available in cache...
     * Return the documents in cache, and return only the keys which still needs to be collected
     * @param keys
     * @private
     */
    _searchKeysInCache(keys){
        const results = {
            nonCachedKeys: [],
            cacheRecords: []
        };
        keys.forEach(key => {
            const cacheRecord = this.fileCache.getKey(key);
            if(cacheRecord){
                results.cacheRecords.push(cacheRecord);
            }else{
                results.nonCachedKeys.push(key);
            }
        });
        return results;
    }

    /**
    * Returns an array with arrays of the given size.
    * @param arr Array to split
    * @param chunkSize Size of every group
    */
    _chunkArray(arr){
        const chunkedArr = [];
        while (arr.length) {
            chunkedArr.push(arr.splice(0, this.maxBatchSize));
        }
        return chunkedArr;
    }

    /**
     * Return all documents for an array of keys (fetch document by document)
     * @param keys
     * @returns {Promise<unknown[]>}
     * @private
     */
    async _getKeysSeperately(keys){
        return Promise.all(
            keys.map(key => this.get(key))
        );
    }

    /**
     * Find one document from the database
     * @param query Database specific query
     * @returns {Promise<*[]|[]|*|undefined|null>}
     */
    async findOne(query){
        try{
            const result = await this.strategy.findOne(query);
            return result ?  this._toFileCacheReturnFile(result.key, result.document) : null;
        }catch(err){
            return this.find(err, 'findOne');
        }
    }

    /**
     * Find all documents matching the query
     * @param query Database specific query
     * @param start Skip x records
     * @param n Return n records
     * @returns {Promise<*[]|[]|*|undefined>}
     */
    async find(query, start, n){
        try{
            const results = await this.strategy.find(query, start, n);
            if(results instanceof Array){
                const fileResults = results.map(result => this._toFileCacheReturnFile(result.key, result.document));
                return fileResults
            }else{
                return [];
            }
        }catch(err){
            return this.find(err, 'find');
        }
    }

    /** handles failoptions depending on loglevel set per method
     * @param err error thrown by the error handler
     * @param methodName name of the called method in which the error occurred
     * @private
     */
    _handleError(err, methodName){
        const failOption = this.failOptions[methodName] || this.failOptions.always || 'error';
        if(failOption === 'silent'){
            return {};
        }else if(failOption === 'warning'){
            console.log(err);
            return {};
        }else{
            throw new Error(err);
        }
    }

    _fromCache(cache, key){
        return cache.getKey(key);
    }

    _toCache(cache, key, value){
        const cacheRecord = cache.setKey(key, value);
        return cacheRecord.cacheable;
    }

    /**
     * sends either a document or a promise to the cache... make sure eventually only Files end up in the cache!
     * @param key
     * @param value
     * @returns {*}
     * @private
     */
    _toFileCacheReturnFile(key, value){
        if(value instanceof Promise){
            value = value.then(v => {
                return new File(key, v, this)
            });
        }else if(!(value instanceof File)){
            value = new File(key, value, this);
        }
        const cacheRecord = this.fileCache.setKey(key, value);
        return cacheRecord.cacheable;
    }

}