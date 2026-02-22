
FROM node:20-alpine

RUN apk add --no-cache tzdata bash

ENV TZ=Asia/Jakarta

WORKDIR /app

COPY package*.json ./

RUN npm install --production \
    && npm install -g sequelize-cli


COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "node index.js"]
