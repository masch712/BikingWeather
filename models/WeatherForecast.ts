import { DateTime } from "luxon";

import * as WeatherForecastUtils from '../lib/WeatherForecastUtils';
import * as _ from 'lodash';
import {logger} from '../lib/Logger';


export interface DbFriendlyWeatherForecast {
  msSinceEpoch: number;
  fahrenheit: number;
  windchillFahrenheit: number;
  condition: string;
  precipitationProbability: number;
  isSweetSpot: boolean;
  city: string;
  state: string;
}

export class WeatherForecast implements DbFriendlyWeatherForecast {
  msSinceEpoch: number;
  fahrenheit: number;
  windchillFahrenheit: number;
  condition: string;
  precipitationProbability: number;
  isSweetSpot: boolean;
  dateTime: DateTime;
  city: string;
  state: string;

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
    condition, precipitationProbability?, city?, state?) {
    const startTime = DateTime.local().valueOf();
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
    const endTime = DateTime.local().valueOf() - startTime;
    logger.debug('forecast ' + msSinceEpoch + ': time to instantiate: ' + endTime);
  }

  toDbObj(): DbFriendlyWeatherForecast {
    const clone = _.clone(this);
    delete clone.dateTime;
    return clone;
  }
}
