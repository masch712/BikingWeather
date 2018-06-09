const superagent = require('superagent');
import * as _ from "lodash";
import { logger } from '../lib/Logger';
import * as AWS from 'aws-sdk';
const TABLENAME = 'UserConfig';
const BATCH_GET_SIZE = 100;
const BATCH_PUT_SIZE = 25;
const { DateTime } = require('luxon');
import config from './config';
import { AttributeMap } from "aws-sdk/clients/dynamodb";
import { UserConfig } from "../models/UserConfig";

AWS.config.update({
  region: 'us-east-1',
});

const connParams = {
  endpoint: config.get('aws.dynamodb.endpoint') as string,
};

//TODO: factor this out
const dynamodb = new AWS.DynamoDB(connParams);
const docClient = new AWS.DynamoDB.DocumentClient(connParams);

const params: AWS.DynamoDB.CreateTableInput = {
  TableName: TABLENAME,
  KeySchema: [
    { AttributeName: 'userId', KeyType: 'HASH' }, // Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: 'userId', AttributeType: 'S' },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

class UserConfigItem {

  constructor(public config: UserConfig,
    public user_id: string) {
  }

  public primaryKey(): string {
    return this.user_id;
  }
}

export class UserConfigDao {


  private static _instance: UserConfigDao = new UserConfigDao();

  constructor() {
    if (UserConfigDao._instance) {
      throw new Error('Singleton already instantiated');
    }
  }

  public static getInstance(): UserConfigDao {
    return UserConfigDao._instance;
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
  public async getConfig(userId): Promise<UserConfig> {
    return docClient.get({
      TableName: TABLENAME,
      Key: {
        userId: userId,
      }
    }).promise()
    .then((result) => {
      return result.Item as UserConfig;
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
  async putToDb(config: UserConfig) {
      return docClient.put({
        TableName: TABLENAME,
        Item: config,
      }).promise()
        .catch((err) => {
          debugger;
          throw err;
        });
  }

  //TODO: test this
  async resubmitUnprocessedItems(unprocessedItems: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap, attemptCount: number = 0, maxAttempts: number = 30) {
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

  async resubmitUnprocessedItemsIndividually(unprocessedItems: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap, attemptCount: number = 0, maxAttempts: number = 30) {
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
}

export const userConfigDaoInstance = UserConfigDao.getInstance();
