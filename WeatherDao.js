const superagent = require('superagent');
const _ = require('lodash');
const WeatherForecast = require('./models/WeatherForecast.js');
const TABLENAME = 'Forecasts';
const AWS = require("aws-sdk");
const MILLIS_PER_HOUR = 1000 * 60 * 60;
const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;
const { DateTime } = require('luxon');

AWS.config.update({
    region: "us-east-1",
    endpoint: "http://localhost:8000"
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName: TABLENAME,
    KeySchema: [
        { AttributeName: "millis", KeyType: "HASH" },  //Partition key
        { AttributeName: "citystate", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "millis", AttributeType: "N" },
        { AttributeName: "citystate", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};



class WeatherDao {
    constructor() {
        //TODO: use convict for config
        this.apiKey = process.env.APIKEY;
    }

    /**
     * Returns a promise for an array of WeatherForecasts
     * @param {String} state 
     * @param {String} city 
     * @returns {Promise} Promise for WeatherForecast[] forecast for 10 days
     */
    async getForecastFromService(state, city) {
        return superagent.get("http://api.wunderground.com/api/" + this.apiKey + "/hourly10day/q/" + state + "/" + city + ".json")
            .then(handleError)
            .then(res => res.body.hourly_forecast)
            .then(wunderForecasts => {
                const forecasts = _.map(wunderForecasts, (wunderForecast) => {
                    return new WeatherForecast(
                        wunderForecast.FCTTIME.epoch * 1000,
                        wunderForecast.temp.english,
                        wunderForecast.windchill.english,
                        wunderForecast.condition,
                        wunderForecast.pop
                    );
                });
                return forecasts;
            });
    }

    async getForecasts(state, city) {
        const baseDateTime = DateTime.local().setZone('America/New_York').set({ minute: 0, second: 0, millisecond: 0 });
        const baseMillis = baseDateTime.valueOf();
        const allMillis = _.range(baseMillis, baseMillis + (MILLIS_PER_DAY * 10), MILLIS_PER_HOUR);
        return docClient.batchGet({
            RequestItems: {
                //TODO: use constant TABLENAME
                Forecasts: {
                    Keys: _.map(allMillis.slice(0, 100), millis => { millis: millis })
                }
            }
        });
    }

    async dropTable() {
        const promise = new Promise((resolve, reject) => {
            dynamodb.deleteTable({
                TableName: TABLENAME
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return promise;
    }

    async createTable() {
        const promise = new Promise((resolve, reject) => {
            dynamodb.createTable(params, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return promise;
    }

    /**
     * Upsert forecasts.
     * @param {WeatherForecast[]} forecasts 
     */
    async putForecastsToDb(forecasts) {
        const promise = new Promise((resolve, reject) => {    
            docClient.batchWrite({
                RequestItems: {
                    Forecasts: _.map(forecasts.slice(0, 24), forecast => {
                        return {
                            PutRequest: {
                                Item: {
                                    millis: forecast.msSinceEpoch,
                                    forecast: forecast
                                }
                            }
                        };
                    })
                }
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return promise;
    }
}

function handleError(res) {
    if (res.body.response.error != null) {
        throw new Error(JSON.stringify(res.body.response.error));
    }
    return res;
}

module.exports = WeatherDao;