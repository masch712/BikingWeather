const utils = require('./utils');
const WeatherDao = require('../WeatherDao');
const weatherDao = new WeatherDao();
const bikingWeatherLambda = require('../lambda');

beforeAll(async () => {
  try {
    await weatherDao.dropTable();
  } catch (err) {
    console.error(err);
  }
  try {
    await weatherDao.createTable();
    const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
    const putResult = await weatherDao.putForecastsToDb(forecasts);
  } catch (err) {
    debugger;
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
