import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../src/server.ts'

test('command upper transform message into UPPERCASE', async () => {
    const app = createServer()
    const message = 'MAKE THIS MESSAGE UPPER PLEASE!'

    const expectedResponse = message.toUpperCase()

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body:{ question: message }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, expectedResponse)
})

test('command lower transform message into lowercase', async () => {
    const app = createServer()
    const message = 'make this message lower please!'

    const expectedResponse = message.toLowerCase()

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body:{ question: message }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, expectedResponse)
})

test('command lowercase transforms message into UNKNOWN', async () => {
    const app = createServer()
    const message = 'HEY THERE.'

    const expectedResponse = "Unknown command. Try 'make this upper please!' or 'make this lower please!'"

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body:{ question: message }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, expectedResponse)
})