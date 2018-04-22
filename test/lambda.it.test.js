const utils = require('./utils');
const WeatherDao = require('../WeatherDao');
jest.mock('../WeatherDao');
let bikingWeatherLambda;
const originalWeatherDao = new WeatherDao();

const mock_getForecast = jest.fn();
beforeAll(() => {
  // Steal the reference to WeatherDao.getForecast() so we can change iT at will
  WeatherDao.mockImplementationOnce(() => {
    return {
      getForecasts: mock_getForecast,
    };
  });
  bikingWeatherLambda = require('../lambda');
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
