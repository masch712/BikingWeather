/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
// const Alexa = require('alexa-sdk');
import { weatherDaoInstance } from '../lib/WeatherDao';
const weatherDao = weatherDaoInstance;


import * as WeatherForecastUtils from '../lib/WeatherForecastUtils';
import * as _ from 'lodash';
import { logger } from '../lib/Logger';
import { DateTime } from 'luxon';
import { Handler } from '../node_modules/@types/aws-lambda/index';
import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Response } from 'ask-sdk-model';

const MIDNIGHT = WeatherForecastUtils.MIDNIGHT;

// Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on
// http://developer.amazon.com.  Make sure to enclose your value in quotes, like this:
// const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = 'amzn1.ask.skill.1fa8202d-fc67-4847-b95f-955d9eef0c22';

const SPEECH_NOT_IMPLEMENTED: string = 'Aaron says: This feature is not yet implemented.';
const STOP_MESSAGE: string = 'Bye';

export const BikingWeatherTomorrow: RequestHandler = {
  canHandle: function (handlerInput: HandlerInput): Promise<boolean> | boolean {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'BikingWeatherTomorrow';
  },
  handle: async function (handlerInput: HandlerInput): Promise<Response> {
    // const config = await userConfig TODO: implement this
    const forecasts = await weatherDao.getForecasts('MA', 'Woburn', 6, 7);

    const tomorrowsCommuteForecasts = WeatherForecastUtils.getTomorrowsCommuteForecasts(forecasts, 6, 7);
    logger.debug('tomorrows commute forecasts: ' + JSON.stringify(tomorrowsCommuteForecasts));
    if (tomorrowsCommuteForecasts.length < 1) {
      throw new Error('unable to retrieve tomorrow\'s forecast');
    }
    const firstBadWeather = _.find(tomorrowsCommuteForecasts, (forecast) => {
      return !WeatherForecastUtils.isInSweetSpot(forecast);
    });

    const isBikingWeather = firstBadWeather ? 'no' : 'yes';

    return Promise.resolve(
      handlerInput.responseBuilder
        .speak(isBikingWeather)
        .getResponse()
    );
  }
};

export const NextGoodBikingWeather: RequestHandler = {
  canHandle: function (handlerInput: HandlerInput): Promise<boolean> | boolean {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'NextGoodBikingWeather';
  },
  handle: async function (handlerInput: HandlerInput): Promise<Response> {
    const forecasts = await weatherDao.getForecasts('MA', 'Woburn', 6, 7);
    const nextGoodCommuteForecasts = WeatherForecastUtils
      .getFirstGoodCommuteDayForecasts(forecasts, 6, 7);

    logger.debug('next good commute forecasts' + JSON.stringify(nextGoodCommuteForecasts));
    let response;
    if (nextGoodCommuteForecasts) {
      const goodForecastDate = nextGoodCommuteForecasts[0].dateTime;
      logger.debug('goodForecastDate: ' + goodForecastDate.toISO());
      const thisMorning = DateTime.local().setZone(goodForecastDate.zone).set(MIDNIGHT);
      const durationTilGood = Math.floor(goodForecastDate.diff(thisMorning, 'days').days);
      let daysTilGoodString = `in ${durationTilGood} days`;
      if (durationTilGood === 1) {
        daysTilGoodString = 'tomorrow';
      }
      response = handlerInput.responseBuilder
        .speak(daysTilGoodString)
        .getResponse();
    } else {
      response = handlerInput.responseBuilder
        .speak('you\'re doomed, the weather is bad for 10 days.')
        .getResponse();
    }
    return Promise.resolve(response);
  }
};
