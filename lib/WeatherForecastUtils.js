const moment = require('moment');
const _ = require('lodash');

/**
 * 
 * @param {WeatherForecast} sample 
 */
exports.isInSweetSpot = function isInSweetSpot(sample) {
    if (
        sample.fahrenheit >= 45 
        && sample.fahrenheit <= 90
        && sample.precipitationProbability < 10
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
