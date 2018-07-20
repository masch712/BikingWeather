import * as utils from "./utils";
import { weatherDaoInstance as weatherDao } from '../lib/WeatherDao';
import { handler } from "../lambda/index";

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
    await weatherDao.putForecastsToDb(forecasts, 'Woburn', 'MA');
  } catch (err) {
    throw err;
  }
});

describe.skip('NextGoodBikingWeather', () => {
  it('works', async () => {
    const mockAlexa = utils.mockAlexa();

    // handler.call()  HOW DO I TEST THIS SHIT?
    const result = mockAlexa.response.speak.mock.calls[0][0];
    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(result).not.toMatch(/Error/);
  });
});

describe.skip('BikingWeatherTomorrow', () => {
  it('works', async () => {
    const mockAlexa = utils.mockAlexa();

    // await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

    const result = mockAlexa.response.speak.mock.calls[0][0];
    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(result).not.toMatch(/Error/);
  });
});
