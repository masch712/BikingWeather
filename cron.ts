import {WeatherDao} from "./lib/WeatherDao";
const weatherDao = new WeatherDao();

exports.putForecasts = async () => {
  const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
  return weatherDao.putForecastsToDb(forecasts);
};
