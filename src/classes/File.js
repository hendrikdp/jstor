import { get, set } from "lodash-es";

export default class{

    constructor(key, jsonDocument, store) {
        if (key) {
            this.exists = jsonDocument ? true : false;
            this.store = store;
            this.key = key;
            this.json(jsonDocument || {});
        } else {
            this.exists = false;
            console.warn('A key should be provided when instantiating a document');
        }
    }

    save(){
        return this.store && this.store.save(this.key, this.json());
    }

    migrateTo(store){
        store.save(this.key, this.json());
    }

    remove(){
        return this.store && this.store.remove(this.key);
    }

    get(xpath){
        return xpath ? get(this.jsonDocument, xpath) : this.jsonDocument;
    }

    set(xpath, value){
        set(this.jsonDocument, xpath, value);
    }

    json(value){
        if(typeof value === 'object') this.jsonDocument = value;
        if(typeof value === 'string') this.jsonDocument = JSON.parse(value);
        return this.jsonDocument;
    }

}