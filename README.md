# MongoDB session store for using with express and express-session

This middleware uses the the official [MongoDB](https://www.mongodb.com/) driver for Node.js.
I have tried to keep the dependencies as small as possible.
It is also possible to get the MongoDB client, database and collection
for other database tasks in the app.
MongoDB recommends only to use one client per app.
The getMongo function will do the job. In a callback it delivers after connection the client, daatabase and collection.

## Installation

After you've created your own project using `npm init`, you can run:

```bash
npm install mongo-express-session-store
```
This will download the session store and add a dependency entry in your `package.json` file.

## Usage ##

Complete working example:
### cjs ###
```diff
'use strict'

const express = require('express')
const session = require('express-session')
+const mongoDBSessionStore = require('mongo-express-session-store')

const app = express()

+const MongoDBSessionStore = mongoDBSessionStore(session)

+const MONGODB_URL = 'mongodb://USER:PASS@127.0.01:27017/?authSource=admin'
+const mongoStore = new MongoDBSessionStore(
+    {
+        mongoUrl: MONGODB_URL,
+        databaseName: "sessionTest",
+        collectionName: "sessions"
+    }
+)

+let mongoClient = null
+mongoStore.getMongo(client => {mongoClient = client; console.log('Client connected')})

app.use(session(
    {
        secret: 'Top secret ...',
        cookie: {
            maxAge: 3600*24*1000,
        },
        resave: false,
        saveUninitialized: true,
+       store: mongoStore
    }
))

app.get('/', (req, res) => {
    req.session.testValue = "XXX"
    res.send("Hello")
})

app.get('/test', (req, res) => {
    res.send(req.session.testValue)
})

app.listen(3000)```
```
### ES6 ###
```diff
'use strict'

import express from 'express'
import session from 'express-session'

+import mongoDBSessionStore from 'mongo-express-session-store'

const app = express()

+const MongoDBSessionStore = mongoDBSessionStore(session)

+const MONGODB_URL = 'mongodb://USER:PASS@127.0.01:27017/?authSource=admin'
+const mongoStore = new MongoDBSessionStore(
+    {
+        mongoUrl: MONGODB_URL,
+        databaseName: "sessionTest",
+        collectionName: "sessions"
+    }
+)

+let mongoClient = null
+mongoStore.getMongo(client => {mongoClient = client; console.log('Client connected')})

app.use(session(
    {
        secret: 'Ich weiss von nix',
        cookie: {
            maxAge: 3600*24*1000,
        },
        resave: false,
        saveUninitialized: true,
+       store: mongoStore
    }
))

app.get('/', (req, res) => {
    req.session.testValue = "XXX"
    res.send("Hello")
})

app.get('/test', (req, res) => {
    res.send(req.session.testValue)
})

app.listen(3000)
```
