#!/usr/bin/env node

import WebSocket from 'ws'
import http from 'http'
import fs   from 'fs'
import * as number from 'lib0/number'
import { setupWSConnection } from './utils.js'

const wss  = new WebSocket.Server({ noServer: true })
const host = process.env.HOST || 'localhost'
const port = number.parseInt(process.env.PORT || '1234')

/**** load valid tokens at startup (if auth is configured) ****/

const TokensFile    = process.env.TOKENS_FILE ?? null
const AuthTokensEnv = process.env.AUTH_TOKENS ?? null

let validTokens = null  // null = no authentication required

if (TokensFile != null) {
  try {
    const FileContent = fs.readFileSync(TokensFile, 'utf8')
    validTokens = new Set(
      FileContent.split('\n')
        .map((Line) => Line.trim())
        .filter((Line) => (Line.length > 0) && ! Line.startsWith('#'))
    )
    console.log(`Loaded ${validTokens.size} token(s) from "${TokensFile}"`)
  } catch (Signal) {
    console.error(`Failed to read TOKENS_FILE "${TokensFile}": ${Signal.message}`)
    process.exit(1)
  }
} else if (AuthTokensEnv != null) {
  validTokens = new Set(
    AuthTokensEnv.split(',')
      .map((Token) => Token.trim())
      .filter((Token) => Token.length > 0)
  )
  console.log(`Loaded ${validTokens.size} token(s) from AUTH_TOKENS`)
} else {
  console.warn(
    'Warning: no AUTH_TOKENS or TOKENS_FILE configured – ' +
    'server is open (no authentication)'
  )
}

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
})

wss.on('connection', setupWSConnection)

server.on('upgrade', (request, socket, head) => {
  if (validTokens != null) {
    const AuthHeader = request.headers['authorization'] ?? null
    let Token = null
    if (AuthHeader != null) {
      const Match = AuthHeader.match(/^Bearer\s+(.+)$/i)
      Token = (Match != null) ? Match[1].trim() : null
    }
    if (Token == null) {
      const RequestURL = new URL(request.url ?? '/', `http://${request.headers.host}`)
      Token = RequestURL.searchParams.get('token')
    }
    if ((Token == null) || ! validTokens.has(Token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
  }
  wss.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
    wss.emit('connection', ws, request)
  })
})

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`)
})
