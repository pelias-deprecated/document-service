# base image
FROM pelias/baseimage

# downloader apt dependencies
# note: this is done in one command in order to keep down the size of intermediate containers
RUN apt-get update && apt-get install -y python3 openjdk-8-jdk gradle python3-pip && rm -rf /var/lib/apt/lists/*

# install python3 dependencies
RUN pip3 install elasticsearch virtualenv

# change working dir
ENV WORKDIR /code/pelias/document-service
WORKDIR ${WORKDIR}

ADD . ${WORKDIR}

# install npm dependencies
RUN npm install

# run tests
RUN npm test

# use pelias user
USER pelias

# start the document-service using the directory the data was downloaded to
CMD ["npm", "start", "--", "/data/whosonfirst"]
