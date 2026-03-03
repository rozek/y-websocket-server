FROM node:22-alpine

RUN mkdir -p /app \
 && cd /app \
 && npm i @y/websocket-server

EXPOSE 1234

CMD ["/bin/sh", "-c", "cd /app && HOST=0.0.0.0 PORT=1234 npx y-websocket"]
