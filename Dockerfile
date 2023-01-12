#########################################
### Base Image                         ##
#########################################
FROM node:14 AS build

WORKDIR /app

COPY ./package.json /app 
COPY ./.eslintrc.js /app
COPY ./tsconfig.json /app
COPY ./yarn.lock /app

RUN yarn install --network-timeout 1000000

COPY ./src /app/src

RUN yarn build
RUN yarn clean:cache

#########################################
### Prod Image                         ##
#########################################
FROM node:14-slim
RUN  apt-get update && apt install libcurl4 libcurl4-gnutls-dev -y && apt autoremove -y

COPY --from=build /app /app
COPY ./deploy /app/deploy
COPY ./data/sample-data /app/data/sample-data
COPY ./data/test-data /app/data/test-data
COPY ./data/templates /app/data/templates
COPY ./static /app/static

WORKDIR /app
RUN ["chmod", "+x", "/app/deploy/webapp.sh"]
RUN ["chmod", "+x", "/app/deploy/debug.sh"]

EXPOSE 2019
ENTRYPOINT [ "./deploy/webapp.sh" ]
