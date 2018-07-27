Node.js/Express.js Backend

## Demo URL
[Get Bitcoin JSON](http://ec2-54-250-181-112.ap-northeast-1.compute.amazonaws.com:4369/api/currencies/btc-usd)
[Get Litecoin JSON](http://ec2-54-250-181-112.ap-northeast-1.compute.amazonaws.com:4369/api/currencies/ltc-usd)


## Installation
Following script will install required node modules
```sh
npm install
npm install nodemon -g
npm install pm2 -g
```

## Package usage
- axios 
HTTP client for calling Cryptonator API
- cors
Handle cors Error in localhost development
- express
Web framework
- redis
Redis client for store and read data from Redis


## Start (Cluster Mode)
Following script will start 4 node.js instance which run in cluster mode
```sh
NODE_PORT=4369 pm2 start -i 4 ./bin/www
```
![PM2 Status](https://i.imgur.com/WRhE8V9.jpg)


## Flow
![Design](https://i.imgur.com/4QhVM3a.jpg)
*Backend part
1. The application will listen on PORT 4369. Once receive api request, the application will check if the pair (e.g. BTC-USD) parameter is exist and is it acceptable in our application. 
2. It will get the timestamp from Redis and check if the last updated cache timestamp is within 30s
3. If within 30s, the application will get the coin data from redis cache and response to client
4. If not, the application will call Cryptonator API to get the latest data and store the latest timstamp and data into Redis.


## Scalability and Minimizing API call Consideration
While all pair data will be store in the Redis and do not have any in-memory store in the application, you may clone this application into multiple instance to handle the request.
Since all data which get from the Cyptonator API will be cache in the Redis and the application will not update the data if idle, the API call frequency can be reduced to:
- Maximum: (Number of Coin-pair) per 30s
- Minimum: 0 (No client requests data will not trigger the api call and no scheduled API call)

*Cache lifetime limited to 30s because prices on cryptoncation are updated every 30 seconds,


