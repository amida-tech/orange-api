# Builder Image
FROM node:10.15.0-alpine as builder

WORKDIR /app/
COPY . /app/

RUN npm install --production

# Runner Image
FROM node:10.15.0-alpine

WORKDIR /app/

COPY --from=builder /app/ /app/

RUN apk update
RUN apk upgrade

# JQ is for to parsing JSON in bash scripts.
RUN apk add jq
RUN apk add bash

ENTRYPOINT ["./create-demo-data.sh"]
