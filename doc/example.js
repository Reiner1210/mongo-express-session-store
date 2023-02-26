'use strict'

import express from 'express'
import helmet from 'helmet'
import session from 'express-session'

import mongoDBSessionStore from 'mongo-express-session-store'

/*
const express = require('express')
const helmet = require('helmet')
const session = require('express-session')
const mongoDBSessionStore = require('mongo-session-store')
*/

const app = express()
app.use(helmet())

// TODO - BEGIN
const DBURL = 'mongodb://USER:PASS@127.0.01:27017/?authSource=admin'
// TODO - END

const mongoStore = new (mongoDBSessionStore(session))(
    {
        mongoUrl: DBURL,
        databaseName: "sessionTest",
        collectionName: "sessions"
    }
)

let mongoClient = null
mongoStore.getMongo((client, datavase) => {mongoClient = client; console.log('Client connected')})

app.use(session(
    {
        secret: 'Ich weiss von nix',
        cookie: {
            // maxAge: 3600*24*1000,
        },
        resave: false,
        saveUninitialized: true,
        store: mongoStore
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

