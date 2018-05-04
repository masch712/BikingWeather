import { DateObjectUnits } from "luxon";
import { WeatherForecast } from "../models/WeatherForecast";

import {DateTime, Duration} from 'luxon';
const _ = require('lodash');

export const SWEETSPOT_MIN_TEMP: number = 45;
export const SWEETSPOT_MAX_TEMP: number = 90;
export const SWEETSPOT_MAX_PRECIP_PROB: number = 10;

export const MIDNIGHT: DateObjectUnits = {hour: 0, minute: 0, second: 0, millisecond: 0};

/**
 *
 * @param {WeatherForecast} sample
 * @return {boolean}
 */
export function isInSweetSpot(sample: WeatherForecast) {
  if (
    sample.fahrenheit >= exports.SWEETSPOT_MIN_TEMP
        && sample.fahrenheit <= exports.SWEETSPOT_MAX_TEMP
        && sample.precipitationProbability <= exports.SWEETSPOT_MAX_PRECIP_PROB
  ) {
    return true;
  }
  return false;
};

/**
 *
 * @param {WeatherForecast[]} forecasts
 * @param {number} startHour
 * @param {number} endHour
 * @return {WeatherForecast[]} tomorrow's forecasts
 */
export function getTomorrowsCommuteForecasts(forecasts: Array<WeatherForecast>, startHour: number, endHour: number) {
  // TODO: stop the local timezone shit, convert to UTC from the start
    const tz = forecasts[0].dateTime.zoneName;
    const now = DateTime.local().setZone(tz);
    const tomorrowBeginning = now.plus(Duration.fromISO('P1D'))
      .set({hour: 0, minute: 0, second: 0, millisecond: 0});
    const tomorrowCommuteBeginning = tomorrowBeginning.plus(Duration.fromISO(`PT${startHour}H`));
    const tomorrowCommuteEnd = tomorrowBeginning.plus(Duration.fromISO(`PT${endHour}H`));
    return _.filter(forecasts, (forecast) => {
      return tomorrowCommuteBeginning.diff(forecast.dateTime).as('milliseconds') <= 0
            && tomorrowCommuteEnd.diff(forecast.dateTime).as('milliseconds') >= 0;
    });
  };

export function getCommuteForecasts(forecasts: Array<WeatherForecast>, startHour: number, endHour: number) {
  const commuteForecasts = _.filter(forecasts, (forecast) => {
    const forecastDateTime = forecast.dateTime;
    return forecastDateTime.hour >= startHour
            && forecastDateTime.hour <= endHour
            && forecastDateTime.weekday != 6
            && forecastDateTime.weekday != 7;
  });
  return commuteForecasts;
};

/**
 *
 * @param {WeatherForecast[]} forecasts
 * @param {number} startHour
 * @param {number} endHour
 * @return {WeatherForecast[]}
 */
export function getFirstGoodCommuteDayForecasts(forecasts: Array<WeatherForecast>, startHour: number, endHour: number) {
    const dayFormat = 'yyyyMMdd';
    const commuteForecasts = exports.getCommuteForecasts(forecasts, startHour, endHour);
    const commuteForecastsByDay = _.groupBy(commuteForecasts, (forecast) => {
      return forecast.dateTime.toFormat(dayFormat);
    });

    const firstGoodDayString = _.find(Object.keys(commuteForecastsByDay).sort(),
      (dayString) => {
        if (_.every(commuteForecastsByDay[dayString], exports.isInSweetSpot)) {
          return true;
        }
        return false;
      });

    if (firstGoodDayString) {
      return commuteForecastsByDay[firstGoodDayString];
    }
    return null;
  };
