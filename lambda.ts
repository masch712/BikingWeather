/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const WeatherDaoLib = require('./lib/WeatherDao');
const weatherDao = new WeatherDaoLib();
const WeatherForecastUtils = require('./lib/WeatherForecastUtils');
import * as _  from 'lodash';
import * as logger from './lib/Logger';
import {DateTime} from 'luxon';

const MIDNIGHT = WeatherForecastUtils.MIDNIGHT;

// Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on
// http://developer.amazon.com.  Make sure to enclose your value in quotes, like this:
// const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;

const SPEECH_NOT_IMPLEMENTED = 'Aaron says: This feature is not yet implemented.';
const STOP_MESSAGE = 'Bye';

// ====================================================================================================================
// Editing anything below this line might break your skill.
// ====================================================================================================================

const handlers = {
  'BikingWeatherTomorrow': async function() {
    try {
      const forecasts = await weatherDao.getForecasts('MA', 'Woburn', 6, 7);

      const tomorrowsCommuteForecasts = WeatherForecastUtils.getTomorrowsCommuteForecasts(forecasts, 6, 7);
      logger.debug({msg: 'tomorrows commute forecasts', data: tomorrowsCommuteForecasts});
      if (tomorrowsCommuteForecasts.length < 1) {
        throw new Error('unable to retrieve tomorrow\'s forecast');
      }
      const firstBadWeather = _.find(tomorrowsCommuteForecasts, (forecast) => {
        return !WeatherForecastUtils.isInSweetSpot(forecast);
      });

      const isBikingWeather = firstBadWeather ? 'no' : 'yes';
      this.response.speak(isBikingWeather);
    } catch (err) {
      this.response.speak(err + '');
    }
    this.emit(':responseReady');
  },
  'NextGoodBikingWeather': async function() {
    try {
      const forecasts = await weatherDao.getForecasts('MA', 'Woburn', 6, 7);
      const nextGoodCommuteForecasts = WeatherForecastUtils
        .getFirstGoodCommuteDayForecasts(forecasts, 6, 7);

      logger.debug({msg: 'next good commute forecasts', data: nextGoodCommuteForecasts});
      if (nextGoodCommuteForecasts) {
        const goodForecastDate = nextGoodCommuteForecasts[0].dateTime;
        logger.debug('goodForecastDate: ' + goodForecastDate.toISO());
        const thisMorning = DateTime.local().setZone(goodForecastDate.zone).set(MIDNIGHT);
        const durationTilGood = Math.floor(goodForecastDate.diff(thisMorning, 'days').days);
        const daysTilGoodString = `in ${durationTilGood} days`;
        this.response.speak(daysTilGoodString);
      } else {
        this.response.speak('you\'re doomed, the weather is bad for 10 days.');
      }
    } catch (err) {
      // TODO: don't speak errors in prod
      this.response.speak(err + '');
    }
    this.emit(':responseReady');
  },
  'AMAZON.HelpIntent': function() {
    this.response.speak(SPEECH_NOT_IMPLEMENTED);
    this.emit(':responseReady');
  },
  'AMAZON.CancelIntent': function() {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },
  'AMAZON.StopIntent': function() {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },
};

exports.handler = function(event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.APP_ID = APP_ID;
  alexa.registerHandlers(handlers);
  logger.debug('calling execute');
  alexa.execute();
};

exports.handlers = handlers;
