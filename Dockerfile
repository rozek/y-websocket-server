FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm dedupe

COPY src ./src

EXPOSE 1234

CMD ["node", "./src/server.js"]
