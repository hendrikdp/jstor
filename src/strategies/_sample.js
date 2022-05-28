export default function(options = {}){

    return function(store){

        const defaultStoreOptions = {

        };
        store.setOptions(Object.assign(defaultStoreOptions, options));

        return {

            /* !!! mandatory functions !!! */

            async get(key){

            },

            async save(key, document){

            },

            async remove(key){

            },

            async keys(){

            },

            /* !!! optional functions !!! */

            async all(start, n, reverse){
                //if this function does not exist, jstor will use the keys()/batch() call!
                //keep in mind that the order in which keys are stored into the database should be respected
                //      if your database driver does not support this, just leave this function out
                //          keys() + batch() call will do the work... (if batch does not exist, documents will be fetched one by one)
                //make sure to return the objects in this format:
                //[{key, document}]
            },

            async batch(ids){
                //if this function does not exist, jstor will fetch document by document!
                //make sure to return the objects in this format:
                //[{key, document}]
            },

            //query will be database type specific
            async find(query, start, n){
                //make sure to return the objects in this format:
                //[{key, document}]
            },

            async findOne(query){
                //make sure to return the objects in this format:
                //{key, document}
            }

        };

    }

}