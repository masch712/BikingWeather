import {weatherDaoInstance, MILLIS_PER_DAY, MILLIS_PER_HOUR} from "./lib/WeatherDao";
import { WeatherForecast } from "./models/WeatherForecast";
const weatherDao = weatherDaoInstance;

export async function putForecasts() {
  const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
  return Promise.all([
    weatherDao.putForecastsToDb(forecasts),
    weatherDao.deleteOldForecastsFromDb(forecasts[0].msSinceEpoch - (MILLIS_PER_HOUR * 2))]);
};
