const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const {DateTime} = require('luxon');
const _ = require('lodash');

class WeatherForecast {
  /**
     *
     * @param {number} msSinceEpoch
     * @param {number} fahrenheit
     * @param {number} windchillFahrenheit
     * @param {Text} condition
     * @param {number} precipitationProbability
     * @param {Text} city
     * @param {Text} state
     */
  constructor(msSinceEpoch, fahrenheit, windchillFahrenheit,
    condition, precipitationProbability, city, state) {
    this.msSinceEpoch = parseInt(msSinceEpoch);
    this.fahrenheit = parseInt(fahrenheit);
    this.windchillFahrenheit = parseInt(windchillFahrenheit);
    this.condition = condition;
    this.precipitationProbability = parseInt(precipitationProbability);
    this.isSweetSpot = WeatherForecastUtils.isInSweetSpot(this);
    // TODO: get smart about timezones for different locations
    this.dateTime = DateTime.fromMillis(this.msSinceEpoch, {zone: 'America/New_York'});
    this.city = city;
    this.state = state;
  }

  toDbObj() {
    return _.omit(this, 'dateTime');
  }
}

module.exports = WeatherForecast;
