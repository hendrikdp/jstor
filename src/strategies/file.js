import { readdir, readFile, writeFile, unlink, mkdir } from "fs/promises";
import path from 'path';

export default function(options = {}){
    const basePath = options.directory || path.join(process.cwd(), './.storage');

    return function(store){

        //by default cache the keys for 30 minutes
        //cache the documents forever
        const defaultStoreOptions = {
            cacheOptions: {
                keys: {
                    maxAge: (30 * 60)
                },
                files: {
                    maxAge: 0
                }
            }
        };
        store.setOptions(Object.assign(defaultStoreOptions, options));

        function getFileName(key){
            return path.join(basePath, `${key}.json`);
        }

        let targetFolderCreation;
        targetFolderCreation = mkdir(basePath, {recursive: true});

        const reJsonExtension = /\.json$/i;

        return {

            async get(key) {
                const file = await readFile(getFileName(key), 'utf8');
                return JSON.parse(file);
            },

            async save(key, document) {
                await targetFolderCreation;
                return writeFile(getFileName(key), JSON.stringify(document, null, 3));
            },

            async remove(key) {
                return unlink(getFileName(key));
            },

            async keys() {
                const files = await readdir(basePath);
                return files.map(file => file.replace(reJsonExtension, ''))
            }

        }

    }

}