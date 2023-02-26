'use strict' 

// http://expressjs.com/en/resources/middleware/session.html

/*
ES6 stuff
import {MongoClient} from 'mongodb'
import {EventEmitter} from 'node:events'
*/

const {MongoClient} = require('mongodb')
const EventEmitter = require('node:events')

/*
ES6 stuff
export default =
*/

module.exports = function (session)
{
    const EV_DB_CONNECTED = "db_connected"

    class MongoDBSessionStore extends session.Store
    {
        constructor(options)
        {
            if (!options)
                options = {}
            super(options)
            this.db = null

            this.mongoUrl = options.mongoUrl != null ? options.mongoUrl : null
            if (!this.mongoUrl)
                throw Error('MongoDB URL must be given !')

                this.databaseName = options.databaseName != null ? options.databaseName : null
                if (!this.databaseName)
                    throw Error('MongoDB databaseName must be given !')

                this.collectionName = options.collectionName != null ? options.collectionName : null
                if (!this.collectionName)
                    throw Error('MongoDB collectionName must be given !')
            
                    this.debug = options.debug != null ? options.debug : false
            this.createIndex = options.createIndex != null ? options.createIndex : true
            this.defaultExpireTime = options.defaultExpireTime != null ? options.defaultExpireTime : 86400*1000
            this.connectDelay = options.connectDelay != null ? options.connectDelay : 0

            this.evEmitter = new EventEmitter()
            // https://mongodb.github.io/node-mongodb-native/5.1/
            this.client = new MongoClient(this.mongoUrl);
            this.init()
        }
        async init()
        {
            try
            {
                await this.client.connect()
                if (this.connectDelay)
                    await new Promise(res => setTimeout(res, this.connectDelay))
                const db = this.client.db(this.databaseName)
                this.collection = db.collection(this.collectionName)
                this.db = db
                // https://www.mongodb.com/docs/manual/tutorial/expire-data/#std-label-ttl-collections
                // const result1 = await this.collection.listIndexes()
                // console.log(result1)
                if (this.createIndex)
                    await this.collection.createIndex({expires:1}, {expireAfterSeconds: 0})
                if (this.debug)
                    console.log("INIT DONE")

                this.evEmitter.emit(EV_DB_CONNECTED)
                }
                catch(error)
            {
                console.log(error)
            }
        }

        /**
         * Get mongodb client, database and collection so the app can use the same client for other DB tasks.
         * MongoDB recommend to use only one client per app.
         * cb is called when connected to database.

         @param {callback cb - the callback. It will be called when the client is connected to MongoDB
            with the following paramaeters:
            cb(client, database, collection)
         */

        getMongo(cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('STORE - GET MONGO')
                if (cb)
                    cb(this.client, this.db, this.collection)
            }
            else
            {
                if (this.debug)
                    console.log('STORE - GET MONGO - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.getMongo(cb))
            }
        }

        async get(sid, cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log(`Store - GET ${sid}`)
                try
                {
                    const result = await this.collection.findOne({_id: ""+sid})
                    if (cb)
                        cb(null, result ? result.session: null)
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log("STORE - GET - not yet connected")
                this.evEmitter.once(EV_DB_CONNECTED, () => this.get(sid, cb))
            }
        }

        getExpireDate(session)
        {
            let expire = null
            try
            {
                if (session['cookie']['expires'])
                    expire = new Date(session['cookie']['expires'])
            }
            catch(error)
            {}
            if (!expire)
                expire = new Date(Date.now() + this.defaultExpireTime);
            return expire
        }
        
        getSession(session)
        {
            const s = {}
            for (const key in session)
                s[key] = session[key].toJSON ? session[key].toJSON() : session[key]
            return s
        }

        async set(sid, session, cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log(`Store - SET ${sid}`)
                const sessionData = this.getSession(session)
                const expireDate = this.getExpireDate(session)
                try
                {
                    await this.collection.updateOne({_id: ""+sid}, {$set: {expires: expireDate, session: sessionData}}, {upsert: true})
                    if (cb)
                        cb(null)
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log('STORE - SET - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.set(sid, session, cb))
            }
        }
        
        async touch(sid, session, cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('Store - TOUCH', sid)
                const sessionData = this.getSession(session)
                const expireDate = this.getExpireDate(session)
                try
                {
                    const result = await this.collection.replaceOne({_id: "" + sid}, {expires: expireDate, session: sessionData})
                    if (cb)
                        cb(result.matchedCount ? null : Error(`${sid} not found`))
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log("STORE - TOUCH - not yet connected")
                this.evEmitter.once(EV_DB_CONNECTED, () => this.touch(sid, session, cb))
            }
        }
            
        async destroy(sid, cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('Store - DESTROY', sid)
                try
                {
                   const result = await this.collection.deleteOne({_id: "" + sid})
                    if (cb)
                        cb(result.acknowledged ? null : Error('not acknowledged'))
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log('STORE - DESTROY - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.destroy(sid, cb))
            }
        }

        async clear(cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('Store - CLEAR')
                try
                {
                    const result = await this.collection.deleteMany({})
                    if (cb)
                        cb(result.acknowledged ? null : Error('not acknowledged'))
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log('STORE - CLEAR - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.clear(cb))
            }
        }
        
        async length(cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('Store - LENGTH')
                try
                {
                    const result = await this.collection.countDocuments({})
                    if (cb)
                        cb(null, result)
                    if (this.debug)
                        console.log(`STORE - LENGTH: ${result}`)
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log('STORE - LENGTH - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.length(cb))
            }
        }

        async all(cb)
        {
            if (this.db)
            {
                if (this.debug)
                    console.log('Store - ALL')
                try
                {
                    const result = this.collection.find({})
                    const s = []
                    for await (const item of result)
                        s.push(item.session)
                    if (cb)
                        cb(null, s)
                }
                catch(error)
                {
                    if (cb)
                        cb(error)
                }
            }
            else
            {
                if (this.debug)
                    console.log('STORE - ALL - not yet connected')
                this.evEmitter.once(EV_DB_CONNECTED, () => this.all(cb))
            }
        }
    }
    return MongoDBSessionStore
}
