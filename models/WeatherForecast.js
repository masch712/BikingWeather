const moment = require('moment-timezone');
const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const { DateTime } = require('luxon');
class WeatherForecast {
    /**
     * 
     * @param {number} msSinceEpoch 
     * @param {number} fahrenheit 
     * @param {number} windchillFahrenheit 
     * @param {Text} condition 
     * @param {number} precipitationProbability
     */
    constructor(msSinceEpoch, fahrenheit, windchillFahrenheit, condition, precipitationProbability) {
        this.msSinceEpoch = parseInt(msSinceEpoch);
        this.dateISO = moment(msSinceEpoch).toISOString();
        this.date = moment(msSinceEpoch).toDate();
        this.day = moment(msSinceEpoch).day();
        this.fahrenheit = parseInt(fahrenheit);
        this.windchillFahrenheit = parseInt(windchillFahrenheit);
        this.condition = condition;
        this.precipitationProbability = parseInt(precipitationProbability);
        this.isSweetSpot = WeatherForecastUtils.isInSweetSpot(this);
        //TODO: get smart about timezones for different locations
        // this.moment_ = WeatherForecastUtils.epochMillisToTz(this.msSinceEpoch, 'America/New_York');
        this.dateTime = DateTime.fromMillis(this.msSinceEpoch, {zone: 'America/New_York'});
    }
}

module.exports = WeatherForecast;