var express = require('express');
var router = express.Router();
const axios = require('axios');

//Redis client
var redis = require('redis');
var client = redis.createClient(6379,'redis-node.gmk625.ng.0001.apne1.cache.amazonaws.com');
//var client = redis.createClient();

const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);
const hgetallAsync = promisify(client.hgetall).bind(client);

const API_ENDPOINT = 'https://api.cryptonator.com/api/ticker/';
const ALL_CURRENCIES_PAIR = [
    { code: 'btc-usd', name: 'Bitcoin' },
    { code: 'eth-usd', name: 'Ether' },
    { code: 'ltc-usd', name: 'Litecoin' },
    { code: 'xmr-usd', name: 'Monero' },
    { code: 'xrp-usd', name: 'Ripple' },
    { code: 'doge-usd', name: 'Dogecoin' },
    { code: 'dash-usd', name: 'Dash' },
    { code: 'maid-usd', name: 'MaidSafeeCoin' },
    { code: 'lsk-usd', name: 'Lisk' },
    { code: 'sjcx-usd', name: 'Storjcoin X' },
    { code: 'fair-usd', name: 'Faircoin' },
    { code: 'hmp-usd', name: 'Hempcoin' },
    { code: 'net-usd', name: 'Netcoin' },
    { code: 'sphr-usd', name: 'Sphere' }
];

// GET currency with currency code
router.get('/:code', async function (req, res, next) {
    var currencyName = '';
    try {
        if (!req.params.code || req.params.code.trim().length == 0) {
            res.statusCode = 400;
            return res.json({});
        }
        //Check code in all currencies list
        let idx = ALL_CURRENCIES_PAIR.findIndex((pair) => (pair.code === req.params.code));
        if (idx !== -1){                
            currencyName = ALL_CURRENCIES_PAIR[idx].name;
        }
   
        //If code not exist, reject request
        if (currencyName == ''){
            res.statusCode = 400;
            return res.json({});
        }

        var currencyData = {};
        var localTimestamp = await getAsync(req.params.code + '-local-timestamp');
        
        if (localTimestamp == undefined || ((parseFloat(localTimestamp) + 30) < Date.now() / 1000)) {
            //Set local timestamp before fetching to prevent concurrent coin request from client
            client.set(req.params.code + '-local-timestamp', (Date.now() / 1000));

            console.log('GET '+ req.params.code + ' from remote API');
            //Cache api response currency data and local server timestamp into redis and response latest data
            var apiUrl = API_ENDPOINT + req.params.code;
            var response = await axios.get(apiUrl, { 
                responseType: 'json', 
                withCredentials: true, 
                maxRedirects: 0, 
                validateStatus: function (status) { 
                    return status >= 200 && status <= 307;
                }            
            });
            
            //Workaround: Cryptonator API response Http status 307 Redirection with 'set-cookie' header
            //However axios will not set this header before redirect to same url
            //Therefore the following case will handle 307 with addition header
            //Ref: https://github.com/axios/axios/issues/953
            if (response.status == 307){
                console.log(response.headers['set-cookie']);
                response = await axios.get(apiUrl, { 
                    responseType: 'json', 
                    withCredentials: true, 
                    headers: { Cookie: response.headers['set-cookie']}
                })
            };
            
            if (response.data.ticker == undefined || response.data.success == false){                
                throw 'API Error, response:' + response;    
            }
                        
            client.set(req.params.code + '-timestamp', response.data.timestamp);            
            client.hmset(req.params.code + '-ticker', response.data.ticker);
            res.statusCode = 200;
            return res.json({ timestamp: response.data.timestamp, ticker: response.data.ticker, name: currencyName, status: true });

        } else {
            console.log('GET '+ req.params.code + ' from Redis');
            //Response cached data
            currencyData.timestamp = await getAsync(req.params.code + '-timestamp');
            currencyData.ticker = await hgetallAsync(req.params.code + '-ticker');
            currencyData.name = currencyName;
            currencyData.status = true;
            res.statusCode = 200;
            return res.json(currencyData);
        }
    } catch (err) {        
        console.error('Error occurs:' + err);
        res.statusCode = 500;
        return res.json({status: false});        
    }

});


// GET currency with currency code
router.get('/test/:code', function (req, res, next) {
    return res.json({ 
        timestamp: 10000000, 
        ticker: {            
            change:'7.69740377',
            price:'8220.10628787',
            volume:'50656.80650633'
        },
        name: req.params.code
    });
});

module.exports = router;
