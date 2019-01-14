# Builder Image
FROM node:10.15.0-alpine as builder

WORKDIR /app/
COPY . /app/

RUN npm install

# Runner Image
FROM node:10.15.0-alpine

WORKDIR /app/

COPY --from=builder /app/ /app/

# JQ is for to parsing JSON in bash scripts.
RUN apk add jq
# RUN apt-get update
# RUN apt-get install jq

RUN chmod 777 /app/create-demo-data.sh
RUN pwd
RUN ls -la
# RUN cat /app/create-demo-data.sh

ENTRYPOINT ["./create-demo-data.sh"]
# CMD ["echo", "hello world hello world hello world"]
# CMD ["./create-demo-data.sh"]
# CMD ["/bin/sh", "-c", "./create-demo-data.sh"]






# FROM        centos:centos7
# MAINTAINER  Amida Ops <ops@amida.com>

# # Enable EPEL, git, Node.js/npm
# RUN yum -y update; yum clean all && \
#     yum -y install epel-release; yum clean all

# # # Install 0MQ, C tools, and OpenSSL
# # RUN yum -y groupinstall "Development Tools"; yum clean all

# # Install node and npm from the official repos
# RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash - && \
#     yum -y install nodejs; yum -y install npm; yum clean all

# # # Install the ever-beloved node-gyp
# # RUN npm install -g node-gyp

# # Copy package.json and install app dependencies
# # (do this before we copy over the rest of the source for caching reasons)
# COPY    package.json /tmp/package.json
# COPY    package-lock.json /tmp/package-lock.json
# RUN     cd /tmp && npm install --production
# RUN     mkdir -p /src && cp -a /tmp/node_modules /src/
# WORKDIR /src

# # Copy app source
# COPY . /src

# ENTRYPOINT bashScript.sh
