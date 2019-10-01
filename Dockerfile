FROM node:12-alpine 

WORKDIR /app
COPY . .
RUN yarn

EXPOSE 3256

CMD node src/index.js