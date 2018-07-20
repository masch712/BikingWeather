const superagent = require('superagent');
import * as _ from "lodash";
import { WeatherForecast, DbFriendlyWeatherForecast } from "../models/WeatherForecast";
import { logger } from '../lib/Logger';
import * as AWS from 'aws-sdk';
const TABLENAME = 'Forecasts2';
export const MILLIS_PER_HOUR = 1000 * 60 * 60;
export const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;
const BATCH_GET_SIZE = 100;
const BATCH_PUT_SIZE = 25;
const { DateTime } = require('luxon');
import config from './config';
import { AttributeMap } from "aws-sdk/clients/dynamodb";

AWS.config.update({
  region: 'us-east-1',
});

const connParams = {
  endpoint: config.get('aws.dynamodb.endpoint') as string,
};

const dynamodb = new AWS.DynamoDB(connParams);
const docClient = new AWS.DynamoDB.DocumentClient(connParams);

const params: AWS.DynamoDB.CreateTableInput = {
  TableName: TABLENAME,
  KeySchema: [
    { AttributeName: 'primary_key', KeyType: 'HASH' }, // Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: 'primary_key', AttributeType: 'S' },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

class ForecastTableItem {

  primary_key: string;
  constructor(public citystate: string,
    public forecasts: DbFriendlyWeatherForecast[]) {
    this.primary_key = citystate;
  }

  public static fromWeatherForecasts(city, state, forecasts: WeatherForecast[]): ForecastTableItem {
    return new ForecastTableItem(city + state, forecasts.map(f => f.toDbObj()));
  }

}

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

  public tableExists(): Promise<Boolean> {
    return dynamodb.describeTable(
      {
        TableName: TABLENAME,
      }
    ).promise()
      .then((data) => {
        return data.Table != null;
      })
      .catch((err) => {
        // TODO: parse the error?
        return false;
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

  private _forecastMillisToGet(hourStart, hourEnd, numDays): Array<number> {
    const baseDateTime = DateTime.local().setZone('America/New_York')
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
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

  async _getForecastsBatch(state, city, allMillis: Array<number>): Promise<Array<WeatherForecast>> {
    const milliChunks = _.chunk(allMillis, BATCH_GET_SIZE);

    logger.silly('db get allMillis: ' + allMillis.join(','));
    const data = await docClient.get({
      TableName: TABLENAME,
      Key: {
        'primary_key': city + state,
      }
    }).promise();

    const item = data.Item as ForecastTableItem;

    logger.debug('flattened chunks');
    const forecasts = _.map(item.forecasts, (f) => {
      return new WeatherForecast(f.msSinceEpoch, f.fahrenheit,
        f.windchillFahrenheit, f.condition, f.precipitationProbability, f.city, f.state);
    });
    return forecasts;
  }

  async getForecasts(state, city, hourStart?, hourEnd?) {
    const numDays = 10;

    const allMillis = this._forecastMillisToGet(hourStart, hourEnd, numDays);
    const forecasts = await this._getForecastsBatch(state, city, allMillis);
    logger.debug('mapped forecasts');
    const sortedForecasts = _.sortBy(forecasts, 'msSinceEpoch');
    logger.debug('sorted forecasts');
    return sortedForecasts;
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
  async putForecastsToDb(forecasts: WeatherForecast[], city: string, state: string) {
    const item = new ForecastTableItem(city + state, _.map(forecasts, forecast => forecast.toDbObj()));
    await docClient.put({
      TableName: TABLENAME,
      Item: item
    }).promise();
  }
}

export const weatherDaoInstance = WeatherDao.getInstance();

function handleWundergroundError(res) {
  if (res.body.response.error != null) {
    const error = new Error('Wunderground API responded with error: '
      + JSON.stringify(res.body.response.error));
    logger.error(error.message);
    throw error;
  }
  return res;
}
