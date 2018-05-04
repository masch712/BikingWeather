import {instance} from "./lib/WeatherDao";
const weatherDao = instance;

exports.putForecasts = async () => {
  const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
  return weatherDao.putForecastsToDb(forecasts);
};
