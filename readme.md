# JSTOR
! Under construction !

Jstor is an extremely simple ODM (Object Document Mapping), mainly focussed on JSON storage...

## Install
> npm install jstor

Jstor can be either used in combination with
* MongoDb
  > npm i jstor jstor-mongodb
* DocumentDb
  > npm i jstor jstor-mongodb
* DynamoDb
  > npm i jstor jstor-dynamodb
* Redis
  > npm i jstor jstor-redis
* S3
  > npm i jstor jstor-s3
* local filesystem

## Usage

### Constructor

#### General options
```js
import Store from "jstor";
const store = new Store({
    strategy: File/Memory/MongoDb/DynamoDb/Redis/S3(strategyOptions),
    cacheOptions: {
      keys: {
        maxAge: seconds how long the keys (index) can get kept in memory
      },
      files: {
        maxAge: seconds how long the documents themselves can remain in memory
      }
    },
    failOptions: {
      get: 'silent' || 'warning' || 'error',
      set: 'silent' || 'warning' || 'error',
      remove: 'silent' || 'warning' || 'error',
      keys: 'silent' || 'warning' || 'error',
      find: 'silent' || 'warning' || 'error',
      ...
      always: 'silent' || 'warning' || 'error'
    }
})
```

#### Memory
```js
import Store, {Memory} from "jstor";
const store = new Store({
    strategy: Memory()
})
```

#### Local file system
```js
import Store, {File} from "jstor";
const store = new Store({
    strategy: File({
      directory: './mystoragedir'
    })
})
```

#### MongoDb / DocumentDb
```js
import Store from "jstor";
import MongoDb from "jstor-mongodb";
const store = new Store({
    strategy: MongoDb({
        uri: 'mongodb://127.0.0.1:27017',
        dbName: 'jstorTestDb',
        collection: 'jstorTestCollection',
        maxBatchSize: 20 //whenever elements are batch fetched, take max 2 only per batch (default is 50)
    })
})
```

#### Redis
```js
import Store from "jstor";
import Redis from "jstor-redis";
const store = new Store({
    strategy: Redis({
        url: 'redis://127.0.0.1:6379',
        keyPrefix: 'jstor' (only take keys into account with this prefix)
    })
})
```

#### S3
```js
import Store from "jstor";
import S3 from "jstor-s3";
const store = new Store({
    strategy: S3({
        bucket: 'jstor-s3-sample',
        region: 'eu-west-1',
        credentials: {
           accessKeyId: process.env.ACCESS_KEY,
           secretAccessKey: process.env.ACCESS_KEY_SECRET
        },
        keyPrefix: 'jstor/'
    })
})
```

#### DynamoDb
```js
import Store from "jstor";
import DynamoDb from "jstor-dynamodb";
const store = new DynamoDb({
    strategy: S3({
        table: 'jstor-dynamodb-test',
        region: 'eu-west-1',
        credentials: {
           accessKeyId: process.env.ACCESS_KEY,
           secretAccessKey: process.env.ACCESS_KEY_SECRET
        }
    })
})
```

### Methods

#### Get document
```js
const jsonDoc = await store.get(key)
```

#### Save document
```js
const jsonDoc = await store.get(key);
await jsonDoc.save();
//or
await store.save(key, jsonValue);
```

#### Delete document
```js
const jsonDoc = await store.get(key);
await jsonDoc.remove();
//or
await store.remove(key);
```

#### Get keys
```js
const keys = await store.keys();
```

#### Get a given number of documents (either from the start or from the end)
```js
const docs = await store.all(startIndex, numberOfDocuments, booleanReverse);
```

#### Get a batch of documents matching the given keys
```js
const docs = await store.batch([keys]);
```

#### Migrate store (move all documents from one storage system to another)
```js
sourceStore.migrateTo(targetStore)
```

#### Migrate document
```js
const doc = await sourceStore.get(key);
await doc.migrateTo(targetStore);
```

#### Find (only supported on MongoDb, for now)
```js
const docs = await store.find(mongoDbSearchDoc);
```

#### FindOne (only supported on MongoDb, for now)
```js
const doc = await store.findOne(mongoDbSearchDoc);
```

#### CRU operations within a JSON document
```js
const doc = await store.get(key);

doc.set('address.street', 'Oudstrijdersstraat');
//doc.set(xpath, value)

doc.get('address.street');
//doc.get(key)
//returns 'Oudstrijdersstraat'

doc.json()
//returns the full json structure of the page
doc.json({foo: 'bar'})
//sets the full json document into the page
doc.json(`{"foo":"bar"}`)
//parses the string value to JSON

await doc.save();
//write changes to the storage system
```
