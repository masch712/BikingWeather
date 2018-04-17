const moment = require('moment-timezone');
moment.tz.setDefault('UTC');
const _ = require('lodash');

exports.SWEETSPOT_MIN_TEMP = 45;
exports.SWEETSPOT_MAX_TEMP = 90;
exports.SWEETSPOT_MAX_PRECIP_PROB = 10;

/**
 * 
 * @param {WeatherForecast} sample 
 * @returns {boolean}
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
 * @returns {WeatherForecast[]} tomorrow's forecasts
 */
exports.getTomorrowsCommuteForecasts = function getTomorrowsCommuteForecasts(forecasts, startHour, endHour) {
    const tomorrowBeginning = moment(moment().add(1, 'days').format('YYYYMMDD'), 'YYYYMMDD');
    const tomorrowCommuteBeginning = tomorrowBeginning.add(startHour, 'hours').valueOf();
    const tomorrowCommuteEnd = tomorrowBeginning.add(endHour, 'hours').valueOf();
    return _.filter(forecasts, (forecast) => {
        return forecast.msSinceEpoch > tomorrowCommuteBeginning 
            && forecast.msSinceEpoch < tomorrowCommuteEnd;
    });
};

exports.getCommuteForecasts = function getCommuteForecasts(forecasts, startHour, endHour) {
    return _.filter(forecasts, (forecast) => {
        const forecastMoment = moment(forecast.msSinceEpoch);
        return forecastMoment.hour() >= startHour
            && forecastMoment.hour() <= endHour
            && forecastMoment.day() > 0
            && forecastMoment.day() < 6;
    });
};

/**
 * 
 * @param {WeatherForecast[]} forecasts 
 * @param {number} startHour 
 * @param {number} endHour 
 * @returns {WeatherForecast[]}
 */
exports.getFirstGoodCommuteDayForecasts = function getFirstGoodCommuteDayForecasts(forecasts, startHour, endHour) {
    const dayFormat = 'YYYYMMDD';
    const commuteForecasts = exports.getCommuteForecasts(forecasts, startHour, endHour);
    const commuteForecastsByDay = _.groupBy(commuteForecasts, (forecast) => {
        return moment(forecast.msSinceEpoch).format(dayFormat);
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
}