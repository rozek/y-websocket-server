
# y-websocket-server :tophat:

> Simple backend for [y-websocket](https://github.com/yjs/y-websocket)

The Websocket Provider is a solid choice if you want a central source that
handles authentication and authorization. Websockets also send header
information and cookies, so you can use existing authentication mechanisms with
this server.

> this repository is basically a copy of the [original](https://github.com/yjs/y-websocket-server), but with templates and instructions for how to setup a Docker container for a TLS-enabled WebSocket server behind [Caddy](https://github.com/caddyserver/caddy) as a reverse proxy, which automatically handles automatic certificate renewal through [Lets Encrypt](https://letsencrypt.org/).

## Quick Start

### Install dependencies

```sh
npm i @y/websocket-server
```

### Start a y-websocket server

This repository implements a basic server that you can adopt to your specific use-case. [(source code)](./src/)

Start a y-websocket server:

```sh
HOST=localhost PORT=1234 npx y-websocket
```

### Client Code:

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'my-roomname', doc)

wsProvider.on('status', event => {
  console.log(event.status) // logs "connected" or "disconnected"
})
```

## Websocket Server

Start a y-websocket server:

```sh
HOST=localhost PORT=1234 npx y-websocket
```

Since npm symlinks the `y-websocket` executable from your local `./node_modules/.bin` folder, you can simply run npx. The `PORT` environment variable already defaults to 1234, and `HOST` defaults to `localhost`.

### Websocket Server with Persistence

Persist document updates in a LevelDB database.

See [LevelDB Persistence](https://github.com/yjs/y-leveldb) for more info.

```sh
HOST=localhost PORT=1234 YPERSISTENCE=./dbDir npx y-websocket
```

### Websocket Server with HTTP callback

Send a debounced callback to an HTTP server (`POST`) on document update. Note that this implementation doesn't implement a retry logic in case the `CALLBACK_URL` does not work.

Can take the following ENV variables:

* `CALLBACK_URL` : Callback server URL
* `CALLBACK_DEBOUNCE_WAIT` : Debounce time between callbacks (in ms). Defaults to 2000 ms
* `CALLBACK_DEBOUNCE_MAXWAIT` : Maximum time to wait before callback. Defaults to 10 seconds
* `CALLBACK_TIMEOUT` : Timeout for the HTTP call. Defaults to 5 seconds
* `CALLBACK_OBJECTS` : JSON of shared objects to get data (`'{"SHARED_OBJECT_NAME":"SHARED_OBJECT_TYPE}'`)

```sh
CALLBACK_URL=http://localhost:3000/ CALLBACK_OBJECTS='{"prosemirror":"XmlFragment"}' npm start
```
This sends a debounced callback to `localhost:3000` 2 seconds after receiving an update (default `DEBOUNCE_WAIT`) with the data of an XmlFragment named `"prosemirror"` in the body.

## Running in Docker with automatic TLS

The recommended production setup runs the y-websocket server behind
[Caddy](https://caddyserver.com/) as a reverse proxy. Caddy automatically
obtains and renews TLS certificates from [Let's Encrypt](https://letsencrypt.org/),
so clients can connect via secure WebSockets (`wss://`) without any manual
certificate management.

The repository contains all required files: `Dockerfile`, `Caddyfile`, and
`docker-compose.yml`.

### Architecture

```
Client  ──wss://──►  Caddy (:443)  ──ws://──►  y-websocket (:1234)
                     │
                     └─ TLS termination & automatic Let's Encrypt renewal
```

Caddy is the only container reachable from outside. The y-websocket container
is only accessible on the internal Docker network.

### Prerequisites

* The host must have a **publicly resolvable DNS name** (e.g. `yws.example.com`)
  pointing to its IP address.
* Ports **80** and **443** must be open and reachable from the internet —
  Let's Encrypt uses port 80 for its HTTP-01 challenge, port 443 for HTTPS/WSS.

### Configuration

Copy `.env.example` to `.env` and set your domain:

```sh
cp .env.example .env
```

Edit `.env`:

```
DOMAIN=yws.example.com
```

### Build and start

```sh
docker compose up -d
```

On the first connection Caddy requests a certificate from Let's Encrypt
automatically. Subsequent renewals (every ~60 days) happen in the background
without any intervention.

> ⚠️ **Do not delete the `caddy_data` volume.** It holds the issued
> certificates. If lost, Caddy must request new ones — Let's Encrypt enforces
> strict [rate limits](https://letsencrypt.org/docs/rate-limits/).

For a very quick and dirty test, you may run

```bash
curl -i --no-buffer \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://$DOMAIN/dummy-roomname
```

### Stop

```sh
docker compose down
```

To also remove the persistent volumes (certificates and Caddy state):

```sh
docker compose down -v
```

### Client code

Once running, clients connect via secure WebSockets on the standard HTTPS port:

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const wsProvider = new WebsocketProvider('wss://yws.example.com', 'my-roomname', doc)

wsProvider.on('status', event => {
  console.log(event.status) // logs "connected" or "disconnected"
})
```

## License

[The MIT License](./LICENSE) © Kevin Jahns
