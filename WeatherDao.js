const superagent = require('superagent');
const _ = require('lodash');
const WeatherForecast = require('./models/WeatherForecast.js');
const TABLENAME = 'Forecasts';
const AWS = require('aws-sdk');
const AwsUtils = require('./lib/AwsUtils');
const MILLIS_PER_HOUR = 1000 * 60 * 60;
const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;
const BATCH_GET_SIZE = 100;
const BATCH_PUT_SIZE = 25;
const {DateTime} = require('luxon');
const Promise = require('bluebird');
const config = require('./lib/config.js');
const logger = require('./lib/Logger');

AWS.config.update({
  region: 'us-east-1',
  endpoint: config.get('aws.dynamodb.endpoint'),
  // TODO: do i need creds?
  // credentials: AwsUtils.creds,
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
Promise.promisifyAll(docClient);

const params = {
  TableName: TABLENAME,
  KeySchema: [
    {AttributeName: 'millis', KeyType: 'HASH'}, // Partition key
    {AttributeName: 'citystate', KeyType: 'RANGE'}, // Sort key
  ],
  AttributeDefinitions: [
    {AttributeName: 'millis', AttributeType: 'N'},
    {AttributeName: 'citystate', AttributeType: 'S'},
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

class WeatherDao {
  constructor() {
    // TODO: use convict for config
    this.apiKey = config.get('wunderground.apiKey');
  }

  tableExists() {
    return dynamodb.describeTable(
      {
        TableName: TABLENAME,
      }
    ).promise()
      .catch((err) => {
        // TODO: parse the error?
        return false;
      })
      .then((data) => {
        return data.Table != null;
      });
  }

  /**
     * Returns a promise for an array of WeatherForecasts
     * @param {String} state
     * @param {String} city
     * @return {Promise} Promise for WeatherForecast[] forecast for 10 days
     */
  async getForecastFromService(state, city) {
    return superagent.get('http://api.wunderground.com/api/'
      + this.apiKey + '/hourly10day/q/' + state + '/' + city + '.json')
      .then(handleWundergroundError)
      .then((res) => res.body.hourly_forecast)
      .then((wunderForecasts) => {
        const forecasts = _.map(wunderForecasts, (wunderForecast) => {
          return new WeatherForecast(
            wunderForecast.FCTTIME.epoch * 1000,
            wunderForecast.temp.english,
            wunderForecast.windchill.english,
            wunderForecast.condition,
            wunderForecast.pop,
            city,
            state
          );
        });
        return forecasts;
      });
  }

  async getForecasts(state, city) {
    const baseDateTime = DateTime.local().setZone('America/New_York')
      .plus({hours: 1})
      .set({minute: 0, second: 0, millisecond: 0});
    const baseMillis = baseDateTime.valueOf();
    const allMillis = _.range(baseMillis, baseMillis + (MILLIS_PER_DAY * 10),
      MILLIS_PER_HOUR);
    const milliChunks = _.chunk(allMillis, BATCH_GET_SIZE);

    logger.debug({
      msg: 'db get',
      data: {
        first: allMillis[0],
        last: _.last(allMillis),
        baseDateTime: baseDateTime.toISO(),
      },
    });

    return Promise.map(milliChunks, (milliChunk) => {
      const req = {
        RequestItems: {
          // TODO: use constant TABLENAME
          Forecasts: {
            Keys: _.map(milliChunk, (millis) => ({millis: millis, citystate: city + state})),
          },
        },
      };
      return docClient.batchGetAsync(req)
        .then((dataChunk) => {
          logger.debug('db got chunk of size: ' + dataChunk.Responses.Forecasts.length);
          return dataChunk;
        });
    }).then((dataChunks) => {
      logger.debug('db got all ' + dataChunks.length + ' chunks');
      let flattened = _.flatten(_.map(dataChunks, (chunk) => chunk.Responses.Forecasts));
      logger.debug('flattened chunks');
      const forecasts = _.map(flattened, (dbRecord) => {
        const f = dbRecord.forecast;
        return new WeatherForecast(f.msSinceEpoch, f.fahrenheit,
          f.windchillFahrenheit, f.condition, f.precipitationProbability, f.city, f.state);
      });
      logger.debug('mapped forecasts');
      const sortedForecasts = _.sortBy(forecasts, 'msSinceEpoch');
      logger.debug('sorted forecasts');
      return sortedForecasts;
    });
  }

  async dropTable() {
    const promise = new Promise((resolve, reject) => {
      dynamodb.deleteTable({
        TableName: TABLENAME,
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
   * @return {Promise}
   */
  async putForecastsToDb(forecasts) {
    console.log('db put: first: ' + forecasts[0].msSinceEpoch + '; last: ' + _.last(forecasts).msSinceEpoch);
    return Promise.map(_.chunk(forecasts, BATCH_PUT_SIZE), (forecastsChunk) => {
      return docClient.batchWriteAsync({
        RequestItems: {
          Forecasts: _.map(forecastsChunk, (forecast) => {
            return {
              PutRequest: {
                Item: {
                  millis: forecast.msSinceEpoch,
                  citystate: forecast.city + forecast.state,
                  forecast: forecast.toDbObj(),
                },
              },
            };
          }),
        },
      });
    }).then((dataChunks) => {
      const unprocessedItems = _.reduce(_.map(dataChunks, (chunk) => chunk.UnprocessedItems),
        (prev, current) => _.merge(prev, current));

      if (_.keys(unprocessedItems).length > 0) {
        throw new Error('Failed to put data: ' + unprocessedItems);
      }
    });
  }
}

function handleWundergroundError(res) {
  if (res.body.response.error != null) {
    const error = new Error('Wunderground API responded with error: '
      + JSON.stringify(res.body.response.error));
    logger.error(error);
    throw error;
  }
  return res;
}

module.exports = WeatherDao;
