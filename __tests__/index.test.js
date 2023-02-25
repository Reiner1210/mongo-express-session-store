'use strict'

/*
Unit and integration test for mongo-session-store
A running mongoDB instance is needed, and you need to give the
mongodb URL, with user and passwort you can it in a .env file in the root of this
project.
.env contains:
MONGODB_URL='mongodb://???:???@127.0.01:27017/?authSource=admin'
*/

const session = require('express-session')
const mongoDBSessionStore = require('mongo-express-session-store')
require('dotenv').config()

console.log(process.env.MONGODB_URL)

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://USER:PASS@127.0.01:27017/?authSource=admin'

const TEST_ID_NE = '000'
const TEST_ID_00 = '001'
const TEST_ID_01 = '002'

const TEST_ID_10 = '010'
const TEST_ID_20 = '020'
const TEST_ID_30 = '030'

const TEST_DATA_00 = 'ABC'
const TEST_DATA_01 = 'XYZ'

const TEST_DATA_10 = '--?--'
const TEST_DATA_11 = '9876'
const TEST_DATA_20 = '#~~'

describe("Test Store", () => {
    let mongoClient = null
    let mongoStore = null
    beforeAll( async () => {
        mongoStore = new (mongoDBSessionStore(session))(
        {
            mongoUrl: MONGODB_URL,
            databaseName: "sessionUnitTest",
            collectionName: "sessions"
        })
        const p = new Promise((res) => {
            mongoStore.getMongo(async (client, database, collection) => {
                mongoClient = client;
                await collection.deleteMany({})
                await collection.insertOne({_id: TEST_ID_00, expires: new Date(Date.now() + 36000*1000), session: {data: TEST_DATA_00}})
                await collection.insertOne({_id: TEST_ID_01, expires: new Date(Date.now() + 36000*1000), session: {data: TEST_DATA_01}})
                res()
            })
        })
        return p
      });

      afterAll(async () =>  {
        if (mongoClient)
            await mongoClient.close()
      })
  
    describe("Test get", () => {
        test("It should respond with an error if session does not exists", (done) => {
            mongoStore.get(TEST_ID_NE, (error, data) => {
                expect(error).toBeNull()
                expect(data).toBeNull()
                done()
            })
        });
        test("It should respond with the session data if session exists", (done) => {
            mongoStore.get(TEST_ID_00, (error, data) => {
                expect(error).toBeNull()
                expect(data.data).toBe(TEST_DATA_00)
                done()
            })
        });
    })

    describe("Test set", () => {
        test("It should add the session if it does not exists", (done) => {
            mongoStore.set(TEST_ID_10, {data: TEST_DATA_10}, (error) => {
                expect(error).toBeNull()
                done()
            })
        });

        test("It should get the just saved session", (done) => {
            mongoStore.get(TEST_ID_10, (error, data) => {
                expect(error).toBeNull()
                expect(data.data).toBe(TEST_DATA_10)
                done()
            })
        });

        test("It should update the session if it exists", (done) => {
            mongoStore.set(TEST_ID_10, {data: TEST_DATA_11}, (error) => {
                expect(error).toBeNull()
                done()
            })
        });

        test("It should get the just updated session", (done) => {
            mongoStore.get(TEST_ID_10, (error, data) => {
                expect(error).toBeNull()
                expect(data.data).toBe(TEST_DATA_11)
                done()
            })
        })
    })

    describe("Test touch", () => {
        test("It should fail if the session does not exist", (done) => {
            mongoStore.touch(TEST_ID_20, {data: TEST_DATA_20}, (error) => {
                expect(error).not.toBeNull()
                done()
            })
        });

        test("It should update the session if it exist", (done) => {
            mongoStore.touch(TEST_ID_10, {data: TEST_DATA_20}, (error) => {
                expect(error).toBeNull()
                done()
            })
        });

        test("It should get the just touched session", (done) => {
            mongoStore.get(TEST_ID_10, (error, data) => {
                expect(error).toBeNull()
                expect(data.data).toBe(TEST_DATA_20)
                done()
            })
        })
    })

    describe("Test destroy", () => {
        test("It should do nothing if the session does not exist", (done) => {
            mongoStore.destroy(TEST_ID_30, (error) => {
                expect(error).not.toBeNull()
                done()
            })
        });

        test("It should delete the session if it  exist", (done) => {
            mongoStore.destroy(TEST_ID_01, (error) => {
                expect(error).toBeNull()
                done()
            })
        });

        test("It should not found the just deleted session", (done) => {
            mongoStore.get(TEST_ID_01, (error, data) => {
                expect(error).toBeNull()
                expect(data).toBeNull()
                done()
            });
        });
    })

    describe("Test length", () => {
        test("It should send the count of the sessions", (done) => {
            mongoStore.length((error, data) => {
                expect(error).toBeNull()
                expect(data).toBe(2)
                done()
            })
        });
    })

    describe("Test all", () => {
        test("It should send all the sessions in an array", (done) => {
            mongoStore.all((error, data) => {
                expect(error).toBeNull()
                expect(data).toBeInstanceOf(Array)
                expect(data.length).toBe(2)
                done()
            })
        });
    })

    describe("Test clear", () => {
        test("It should not fail", (done) => {
            mongoStore.clear((error) => {
                expect(error).toBeNull()
                done()
            })
        });

        test("It should be no more data in the database", (done) => {
            mongoStore.length((error, data) => {
                expect(error).toBeNull()
                expect(data).toBe(0)
                done()
            })
        });
    })
})
