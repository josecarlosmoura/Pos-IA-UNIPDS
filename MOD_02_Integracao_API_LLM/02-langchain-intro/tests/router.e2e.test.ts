import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../src/server.ts'

test('command upper transform message into UPPERCASE', async () => {
    const app = createServer()
    const message = 'Make this message upper please!'

    const expectedResponse = message.toUpperCase()

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body:{ question: message }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, expectedResponse)
})