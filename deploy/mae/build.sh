#!/bin/bash -x

# Setup temp directories
INSTALL_DIR=$(mktemp -d testinstall.XXXXXXXX)
MONGO_DATA_DIR=$(mktemp -d testmongodata.XXXXXXXX)

MONGO_VERSION=3.4.17
MONGO_DIR_NAME=mongodb-linux-x86_64-rhel70-$MONGO_VERSION
MONGO_TAR_NAME=$MONGO_DIR_NAME.tgz
MONGO_URL=https://fastdl.mongodb.org/linux/$MONGO_TAR_NAME

NODE_DIR_NAME=node-v8.12.0-linux-x64
NODE_TAR_NAME=$NODE_DIR_NAME.tar.xz
NODE_URL=https://nodejs.org/dist/v8.12.0/$NODE_TAR_NAME

# Install dependencies
cd $INSTALL_DIR

# MongoDB
wget -q $MONGO_URL
tar -xf $MONGO_TAR_NAME
export PATH=$PWD/$MONGO_DIR_NAME/bin:$PATH

# Node
wget -q $NODE_URL
tar -xf $NODE_TAR_NAME
export PATH=$PWD/$NODE_DIR_NAME/bin:$PATH

cd ..

# Start Mongo
mongod --dbpath $PWD/$MONGO_DATA_DIR > /dev/null &
MONGO_PROC=$!

# Removing node_modules and reinstalling ensures mongo has plenty of time to start up
rm -rf node_modules
npm install

# Grunt is used to run the tests
npm install grunt-cli

# Run the tests
cp .env.example .env.test
./node_modules/grunt-cli/bin/grunt test

# Cleanup
kill $MONGO_PROC
rm -rf $INSTALL_DIR $MONGO_DATA_DIR node_modules
