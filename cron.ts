import {instance, MILLIS_PER_DAY, MILLIS_PER_HOUR} from "./lib/WeatherDao";
import { WeatherForecast } from "./models/WeatherForecast";
const weatherDao = instance;

exports.putForecasts = async () => {
  const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
  return Promise.all([
    weatherDao.putForecastsToDb(forecasts),
    weatherDao.deleteOldForecastsFromDb(forecasts[0].msSinceEpoch - (MILLIS_PER_HOUR * 2))]);
};
