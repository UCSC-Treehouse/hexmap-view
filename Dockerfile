from ubuntu:16.04


RUN apt-get update &&\
apt-get install -y wget xz-utils vim less

RUN groupadd -g 1304 hexdocker &&\
useradd hexmap -u 30056 -g 1304 -m -s /bin/bash

ENV HEXMAP=/data
ENV HEX_VIEWER_CONFIG=$HEXMAP/config/prod_2023-08-10.txt
ENV PATH=$HEXMAP/packages/node/bin:$HEXMAP/packages/mongodb/bin:$PATH

USER hexmap

# TODO: Replace this COPY with a call to download a pinned version of the code from GitHub into /app
COPY --chown=hexmap:hexdocker . $HEXMAP

# Extract pre-downloaded packages
WORKDIR $HEXMAP/packages

RUN tar xf node-v8.11.3-linux-x64.tar.xz &&\
ln -s node-v8.11.3-linux-x64 node &&\
tar xf mongodb-linux-x86_64-3.6.23.tgz &&\
ln -s mongodb-linux-x86_64-3.6.23 mongodb

WORKDIR $HEXMAP
RUN bin/installWww
