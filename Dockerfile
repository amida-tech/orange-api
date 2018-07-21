FROM        centos:centos7
MAINTAINER  Amida Ops <ops@amida.com>

# Enable EPEL, git, Node.js/npm and zeromq
RUN yum -y update; yum clean all && \
    yum -y install epel-release; yum clean all

# Install 0MQ, C tools, and OpenSSL
RUN yum -y groupinstall "Development Tools"; yum clean all

# Install node and npm from the official repos
RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash - && \
    yum -y install nodejs; yum -y install npm; yum clean all

# Install the ever-beloved node-gyp
RUN npm install -g node-gyp

# Copy package.json and install app dependencies
# (do this before we copy over the rest of the source for caching reasons)
COPY    package.json /tmp/package.json
RUN     cd /tmp && npm install --production
RUN     mkdir -p /src && cp -a /tmp/node_modules /src/
WORKDIR /src

# Copy app source
# .dockerignore crucially means we don't copy node_modules
COPY . /src
COPY ./.env.docker /src/.env
# COPY ./iosKey.p8 /src/iosKey.p8

EXPOSE 5000
ENV NODE_ENV production
CMD ["node", "run.js"]
