import * as utils from "./utils";
import { WeatherDao } from '../lib/WeatherDao';
const weatherDao = new WeatherDao();
const bikingWeatherLambda = require('../lambda');
jest.setTimeout(10000);

beforeAll(async () => {
  try {
    await weatherDao.dropTable();
  } catch (err) {
    console.error(err);
  }
  try {
    await weatherDao.createTable();
    const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
    await weatherDao.putForecastsToDb(forecasts);
  } catch (err) {
    throw err;
  }
});

describe('NextGoodBikingWeather', () => {
  it('works', async () => {
    const mockAlexa = utils.mockAlexa();
    await bikingWeatherLambda.handlers.NextGoodBikingWeather.apply(mockAlexa);

    const result = mockAlexa.response.speak.mock.calls[0][0];
    console.log(result);
    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(result).not.toMatch(/Error/);
  });
});

describe('BikingWeatherTomorrow', () => {
  it('works', async () => {
    const mockAlexa = utils.mockAlexa();

    await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

    const result = mockAlexa.response.speak.mock.calls[0][0];
    console.log(result);
    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(result).not.toMatch(/Error/);
  });
});
