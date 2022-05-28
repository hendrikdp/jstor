import fs from "fs";
import path from "path";

import Store from "../../classes/Store.js";
import File from "../../classes/File.js";
import file from "../file.js";

const files = {
    aaa: {foo: 'bar'},
    bbb: {nest:{ed:{hello:'aaa'}}},
    ccc: {any: 'thing'},
    ddd: {hit: 'me', auw: 'pain'}
}

function clearAllFiles(dir){
    try{
        const files = fs.readdirSync(dir)
        for (const file of files) {
            fs.unlinkSync(path.join(dir, file));
        }
    }catch(err){
        console.warn(`Could not clear ${dir}`);
    }
}

describe(`STRATEGIES - File strategy`, ()=>{

    describe(`When using default arguments`, ()=>{

        let store;
        const basePath = path.join(process.cwd(), './.storage');
        beforeAll(async ()=>{
            clearAllFiles(basePath);
            store = new Store({
                strategy: file()
            });
            await Promise.all(Object.keys(files).map(key => store.save(key, files[key])));
        });

        test(`Stored files should be stored in the ./storage folder`, async () => {
            const aaaFile = fs.readFileSync(path.join(basePath, 'aaa.json'), 'utf-8');
            const aaa = await store.get('aaa');
            expect(aaa.json()).toMatchObject(JSON.parse(aaaFile));
        });

        test(`All keys should be found`, async () => {
            const keys = await store.keys();
            expect(keys).toEqual(Object.keys(files));
        });

        test(`A key can be read from the fetched key`, async ()=>{
            const file = await store.get('bbb');
            expect(file.get('nest.ed.hello')).toBe(files.bbb.nest.ed.hello);
        });

        test(`A document can be changed`, async () => {
           const file = await store.get('ccc');
           file.set('some.value.somewhere', 'yay');
           const result = await file.save();
           expect(result.json().some.value.somewhere).toBe('yay');
           //expect cache to be updated
           const getFileFromCache = await store.get('ccc');
           expect(getFileFromCache.json().some.value.somewhere).toBe('yay');
        });

        test(`A document can be deleted`, async () => {
            const file = await store.get('ddd');
            await file.remove();
            const keys = await store.keys();
            expect(keys.length).toBe(Object.keys(files).length-1);
            expect(fs.existsSync(path.join(basePath, 'ddd.json'))).toBeFalsy();
        })

        test(`A document can be created using the File-constructor`, async () => {
            const fileToSave = new File('eee', {fooo:'baaar'}, store);
            await fileToSave.save();
            const file = await store.get('eee');
            expect(fs.existsSync(path.join(basePath, 'eee.json'))).toBeTruthy();
        })

        test(`A document can be created using the store instance`, async () => {
            const valueToStore = {yay: true};
            const file = await store.save('fff', valueToStore);
            expect(file.json()).toEqual(valueToStore);
            expect(fs.existsSync(path.join(basePath, 'fff.json'))).toBeTruthy();
        })

    });

    describe(`When migration needs to happen from one store to another`, ()=>{
        let store1, store2;
        const basePath = path.join(process.cwd(), './.storage');
        beforeAll(async ()=>{
            clearAllFiles(basePath);
            clearAllFiles(`${basePath}2`);
            store1 = new Store({strategy: file()});
            store2 = new Store({
                strategy: file({directory: `${basePath}2`})
            })
            await Promise.all(Object.keys(files).map(key => store1.save(key, files[key])));
        });

        test(`Files can be moved from store 1 to store 2`, async () => {
            await store1.migrateTo(store2);
            const keysStore1 = await store1.keys();
            const keysStore2 = await store2.keys();
            expect(keysStore1).toEqual(keysStore2);
        });

    });

})