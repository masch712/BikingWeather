const {DateTime, Duration} = require('luxon');
const _ = require('lodash');

exports.SWEETSPOT_MIN_TEMP = 45;
exports.SWEETSPOT_MAX_TEMP = 90;
exports.SWEETSPOT_MAX_PRECIP_PROB = 10;

/**
 *
 * @param {WeatherForecast} sample
 * @return {boolean}
 */
exports.isInSweetSpot = function isInSweetSpot(sample) {
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
exports.getTomorrowsCommuteForecasts = function getTomorrowsCommuteForecasts(forecasts, startHour, endHour) {
  // TODO: stop the local timezone shit, convert to UTC from the start
  const tz = forecasts[0].zone;
  const now = DateTime.local().setZone(tz);
  const tomorrowBeginning = now.plus(Duration.fromISO('P1D')).set({hour: 0, minute: 0, second: 0, millisecond: 0});
  const tomorrowCommuteBeginning = tomorrowBeginning.plus(Duration.fromISO(`PT${startHour}H`));
  const tomorrowCommuteEnd = tomorrowBeginning.plus(Duration.fromISO(`PT${endHour}H`));
  return _.filter(forecasts, (forecast) => {
    return tomorrowCommuteBeginning.diff(forecast.dateTime).as('milliseconds') <= 0
            && tomorrowCommuteEnd.diff(forecast.dateTime).as('milliseconds') >= 0;
  });
};

exports.getCommuteForecasts = function getCommuteForecasts(forecasts, startHour, endHour) {
  const commuteForecasts = _.filter(forecasts, (forecast) => {
    const forecastDateTime = forecast.dateTime;
    return forecastDateTime.hour >= startHour
            && forecastDateTime.hour <= endHour
            && forecastDateTime.weekday > 0
            && forecastDateTime.weekday < 6;
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
exports.getFirstGoodCommuteDayForecasts = function getFirstGoodCommuteDayForecasts(forecasts, startHour, endHour) {
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
