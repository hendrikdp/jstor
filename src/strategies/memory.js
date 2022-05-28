export default function(options = {}){
    const storageVariable = options.storageVariable || {};

    return function(store){

        return {

            async get(key){
                return storageVariable[key] || null;
            },

            async save(key, document){
                return storageVariable[key] = document;
            },

            async remove(key){
                return delete storageVariable[key];
            },

            async keys(){
                return Object.keys(storageVariable);
            }

        }

    }

}