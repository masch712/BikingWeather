const superagent = require('superagent');
import * as _ from "lodash";
import { WeatherForecast, DbFriendlyWeatherForecast } from "../models/WeatherForecast";
import { logger } from '../lib/Logger';
import * as AWS from 'aws-sdk';
const TABLENAME = 'Forecasts';
export const MILLIS_PER_HOUR = 1000 * 60 * 60;
export const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;
const BATCH_GET_SIZE = 100;
const BATCH_PUT_SIZE = 25;
const {DateTime} = require('luxon');
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
    {AttributeName: 'primary_key', KeyType: 'HASH'}, // Partition key
    {AttributeName: 'millis', KeyType: 'RANGE'}, // Sort key
  ],
  AttributeDefinitions: [
    {AttributeName: 'primary_key', AttributeType: 'S'},
    {AttributeName: 'millis', AttributeType: 'N'},
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

class ForecastTableItem {

  primary_key: string;
  constructor(public millis: number, 
    public citystate: string, 
    public forecast: DbFriendlyWeatherForecast) {
      this.primary_key = ForecastTableItem.primaryKey(forecast.msSinceEpoch, forecast.city, forecast.state);
  }

  public static fromWeatherForecast (forecast: WeatherForecast): ForecastTableItem {
    return new ForecastTableItem(forecast.msSinceEpoch, forecast.city + forecast.state, forecast.toDbObj());
  }

  public static primaryKey(millis: number, city: string, state: string): string {
    return millis.toString() + '_' + city + state;
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
  
  public tableExists():Promise<Boolean> {
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
  
  async _getForecastsBatch(state, city, allMillis: Array<number>): Promise<Array<WeatherForecast>> {
    const milliChunks = _.chunk(allMillis, BATCH_GET_SIZE);

    logger.silly('db get allMillis: ' + allMillis.join(','));
    const chunkPromises = _.map(milliChunks, async (milliChunk) => {
      const req = {
        RequestItems: {
          // TODO: use constant TABLENAME
          Forecasts: {
            Keys: _.map(milliChunk, (millis) => ({
              primary_key: ForecastTableItem.primaryKey(millis, city, state),
              millis: millis,
            })),
          },
        },
      };
      try {
        // const dataChunk = await docClient.batchGet(req).promise();
        const dataChunk = await docClient.batchGet(req).promise();
        logger.debug('db got chunk of size: ' + dataChunk.Responses.Forecasts.length);
        return dataChunk;
      } catch (err) {
        logger.error('Error getting chunk: ' + err);
        return Promise.reject(err);
      }
    });
    
    const dataChunks = await Promise.all(chunkPromises)
    logger.debug('db got all ' + dataChunks.length + ' chunks');
    let flattened = _.flatten(_.map(dataChunks, (chunk) => chunk.Responses.Forecasts));
    logger.debug('flattened chunks');
    const forecasts = _.map(flattened, (dbRecord) => {
      const f = dbRecord.forecast as WeatherForecast;
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
  async putForecastsToDb(forecasts: WeatherForecast[]) {
    const chunkPromises = _.map(_.chunk(forecasts, BATCH_PUT_SIZE), (forecastsChunk) => {
      return docClient.batchWrite({
        RequestItems: {
          Forecasts: _.map(forecastsChunk, (forecast) => {
            const item = ForecastTableItem.fromWeatherForecast(forecast);
            return {
              PutRequest: {
                Item: item,
              },
            };
          }),
        },
      }).promise()
      .catch((err) => {
        debugger;
        throw err;
      })
    });
  
    try{
      const dataChunks = await Promise.all(chunkPromises);
      const unprocessedItems = _.reduce(_.map(dataChunks, (chunk) => chunk.UnprocessedItems),
      (prev, current) => _.merge(prev, current));
      
      if (_.keys(unprocessedItems).length > 0) {
        return this.resubmitUnprocessedItems(unprocessedItems);
      }
    } catch (err) {
      logger.debug('failed to put chunks: ' + err);
      return Promise.reject(err);
    }
  }

  //TODO: test this
  async resubmitUnprocessedItems(unprocessedItems: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap, attemptCount: number = 0, maxAttempts: number = 30)
  {
    return docClient.batchWrite({
      RequestItems: unprocessedItems
    }).promise()
    .then((result) => {
      const newUnprocessedItems = Object.values(result.UnprocessedItems)[0];
      if (attemptCount < maxAttempts) {
        if (newUnprocessedItems.length > 0) {
          attemptCount++;
          logger.debug('Resubmitting ' + newUnprocessedItems.length + ' items; attemptCount: ' + attemptCount);
          return this.resubmitUnprocessedItems(result.UnprocessedItems, attemptCount, maxAttempts);
        }
        else {
          return result;
        }
      }
      else {
        throw new Error('Unable to submit ' + newUnprocessedItems.length + ' UnprocessedItems after ' + attemptCount + ' attempts.');
      }
    })
  }

  async resubmitUnprocessedItemsIndividually(unprocessedItems: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap, attemptCount: number = 0, maxAttempts: number = 30)
  {
    const promises = _.map(unprocessedItems[TABLENAME], (item) => {
      return docClient.put({
          TableName: TABLENAME,
          Item: item.PutRequest.Item,
      }).promise();
    });

    try {
      logger.debug('Attempting to resubmit ' + promises.length + ' items');
      const results = await Promise.all(promises);
    }
    catch (err) {
      return Promise.reject(err);
    }
  }

  //TODO: experiment with hyper-modularity (100 lines per file)
  async deleteOldForecastsFromDb(millisCutoff: number): Promise<number> {
    const queryOutput = await docClient.scan({
        TableName: TABLENAME,
        ProjectionExpression: 'primary_key,millis',
        
      }).promise();

    logger.debug('Found ' + queryOutput.Count + ' items.');
    const itemsToDelete = 
      _.filter(queryOutput.Items as Array<AttributeMap & ForecastTableItem>, 
        (item) => item.millis <= millisCutoff);
    
    logger.debug('Deleting ' + itemsToDelete.length + ' items.');
    const promisesForDelete = _.map(itemsToDelete, (item) => 
      docClient.delete({
        TableName: TABLENAME,
        Key: {
          primary_key: item.primary_key,
          millis: item.millis,
        },
      }).promise());
    
    return Promise.all(promisesForDelete)
    .then((deleteResults) => {
      return deleteResults.length;
    });
    
  }
}

export const  instance = WeatherDao.getInstance();

function handleWundergroundError(res) {
  if (res.body.response.error != null) {
    const error = new Error('Wunderground API responded with error: '
      + JSON.stringify(res.body.response.error));
    logger.error(error.message);
    throw error;
  }
  return res;
}
