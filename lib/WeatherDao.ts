const superagent = require('superagent');
const _ = require('lodash');
import { WeatherForecast } from "../models/WeatherForecast";
const TABLENAME = 'Forecasts';
const AWS = require('aws-sdk');
const MILLIS_PER_HOUR = 1000 * 60 * 60;
const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;
const BATCH_GET_SIZE = 100;
const BATCH_PUT_SIZE = 25;
const {DateTime} = require('luxon');
const config = require('../lib/config.js');
const logger = require('../lib/Logger');

AWS.config.update({
  region: 'us-east-1',
  endpoint: config.get('aws.dynamodb.endpoint'),
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

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

export class WeatherDao {

  private static _instance: WeatherDao = new WeatherDao();
  apiKey: string;

  constructor() {
    if (WeatherDao._instance) {
      throw new Error('Singleton already instantiated');
    }
    // TODO: use convict for config
    this.apiKey = config.get('wunderground.apiKey');
  }

  public static getInstance(): WeatherDao {
    return WeatherDao._instance;
  }

  public tableExists():boolean {
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
  public async getForecastFromService(state, city): Promise<Array<WeatherForecast>> {
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

  private _forecastMillisToGet(hourStart, hourEnd, numDays): Array<Number> {
    const baseDateTime = DateTime.local().setZone('America/New_York')
      .set({hour: 0, minute: 0, second: 0, millisecond: 0});
    const baseMillis = baseDateTime.valueOf();
    let allMillis = [];
    if (_.isNumber(hourStart) && _.isNumber(hourEnd)) {
      let startMillis = baseMillis + (hourStart * MILLIS_PER_HOUR);
      let endMillis = baseMillis + (hourEnd * MILLIS_PER_HOUR);
      for (let iDay = 0; iDay < numDays; iDay++) {
      // TODO: use Luxon in case daylight savings type shit?
        const millisOffset = MILLIS_PER_DAY;
        startMillis += millisOffset;
        endMillis += millisOffset;
        allMillis.push(startMillis, endMillis);
      }
    } else {
      allMillis = _.range(baseMillis, baseMillis + (MILLIS_PER_DAY * numDays),
        MILLIS_PER_HOUR);
    }
    return allMillis;
  }

  async getForecasts(state, city, hourStart?, hourEnd?) {
    const numDays = 10;

    const allMillis = this._forecastMillisToGet(hourStart, hourEnd, numDays);
    const milliChunks = _.chunk(allMillis, BATCH_GET_SIZE);

    logger.debug('db get allMillis: ' + allMillis.join(','));
    const chunkPromises = _.map(milliChunks, (milliChunk) => {
      const req = {
        RequestItems: {
          // TODO: use constant TABLENAME
          Forecasts: {
            Keys: _.map(milliChunk, (millis) => ({millis: millis, citystate: city + state})),
          },
        },
      };
      return docClient.batchGet(req).promise()
        .then((dataChunk) => {
          logger.debug('db got chunk of size: ' + dataChunk.Responses.Forecasts.length);
          return dataChunk;
        });
    });

    return Promise.all(chunkPromises)
    .then((dataChunks) => {
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
    const chunkPromises = _.map(_.chunk(forecasts, BATCH_PUT_SIZE), (forecastsChunk) => {
      return docClient.batchWrite({
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
      }).promise();
    })
    
    return Promise.all(chunkPromises)
    .then((dataChunks) => {
      const unprocessedItems = _.reduce(_.map(dataChunks, (chunk) => chunk.UnprocessedItems),
        (prev, current) => _.merge(prev, current));

      if (_.keys(unprocessedItems).length > 0) {
        throw new Error('Failed to put data: ' + unprocessedItems);
      }
    });
  }
}

export const  instance = WeatherDao.getInstance();

function handleWundergroundError(res) {
  if (res.body.response.error != null) {
    const error = new Error('Wunderground API responded with error: '
      + JSON.stringify(res.body.response.error));
    logger.error(error);
    throw error;
  }
  return res;
}
