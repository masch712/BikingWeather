const WeatherForecast = require('../models/WeatherForecast');
const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const utils = require('./utils');
const _ = require('lodash');
const {DateTime} = require('luxon');
const WeatherDao = require('../WeatherDao');
jest.mock('../WeatherDao');
let bikingWeatherLambda;

const mock_getForecast = jest.fn();
let originalWeatherForecastUtils = _.clone(WeatherForecastUtils);

beforeAll(() => {
  WeatherDao.mockImplementationOnce(() => {
    return {
      getForecasts: mock_getForecast,
    };
  });
  bikingWeatherLambda = require('../lambda');
});
afterEach(() => {
  // Reset WeatherForecastUtils mocks
  Object.keys(WeatherForecastUtils).forEach((key) => {
    WeatherForecastUtils[key] = originalWeatherForecastUtils[key];
  });
});

describe('BikingWeatherTomorrow Intent', () => {
  it('speaks \'yes\' for good weather', async () => {
    const expectedForecast = new WeatherForecast(1, 1, 1, '');
    mock_getForecast.mockImplementationOnce((state, city) => {
      return Promise.resolve([expectedForecast]);
    });

    WeatherForecastUtils.getTomorrowsCommuteForecasts = jest.fn((forecasts, startHour, endHour) => {
      return [forecasts[0], forecasts[1]];
    });
    WeatherForecastUtils.isInSweetSpot = jest.fn((forecast) => {
      return true;
    });

    const mockAlexa = utils.mockAlexa();

    await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('yes');
  });

  it('speaks \'no\' for bad weather', async () => {
    const expectedForecast = new WeatherForecast(1, 1, 1, '');
    mock_getForecast.mockImplementationOnce((state, city) => {
      return Promise.resolve([expectedForecast]);
    });
    WeatherForecastUtils.getTomorrowsCommuteForecasts = jest.fn((forecasts, startHour, endHour) => {
      return [forecasts[0], forecasts[1]];
    });
    WeatherForecastUtils.isInSweetSpot = jest.fn((forecast) => {
      return false;
    });

    const mockAlexa = utils.mockAlexa();

    await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('no');
  });

  it('speaks \'error\' for error', async () => {
    const expectedError = new Error('rekt');
    mock_getForecast.mockImplementationOnce((state, city) => {
      return Promise.reject(expectedError);
    });

    const mockAlexa = utils.mockAlexa();

    await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(mockAlexa.response.speak.mock.calls[0][0]).toBe(expectedError + '');
  });
});

describe('NextGoodBikingWeather Intent', () => {
  it('says how many days til good weather', async () => {
    const expectedGoodCommuteForcasts = [];
    const allForecasts = [];
    const baseDateTime = DateTime.local().setZone('America/New_York').set({hour: 0, minute: 0, second: 0, millisecond: 0});

    for (let hr = 0; hr < 24 * 10; hr ++) {
      const forecastDateTime = baseDateTime.plus({hours: hr});
      const forecast = new WeatherForecast(forecastDateTime.valueOf(), 1, 1, 'poo', 99);
      allForecasts.push(forecast);
    }

    const goodweatherForecasts = getFirstWeekdayForecasts(baseDateTime, allForecasts);
    goodweatherForecasts.forEach((forecast) => {
      forecast.fahrenheit = WeatherForecastUtils.SWEETSPOT_MIN_TEMP + 1;
      forecast.precipitationProbability = 0;
      expect(WeatherForecastUtils.isInSweetSpot(forecast)).toBeTruthy();
      expectedGoodCommuteForcasts.push(forecast);
    });

    const niceDay = goodweatherForecasts[0].dateTime.diff(baseDateTime, 'day').days;

    mock_getForecast.mockImplementationOnce((state, city) => {
      return Promise.resolve(allForecasts);
    });

    const mockAlexa = utils.mockAlexa();

    await bikingWeatherLambda.handlers.NextGoodBikingWeather.apply(mockAlexa);

    expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
    expect(mockAlexa.response.speak.mock.calls[0][0]).toEqual(`in ${niceDay} days`);
  });
});

/**
 *
 * @param {DateTime} baseDateTime
 * @param {WeatherForecast[]} forecasts
 * @return {WeatherForecast[]} forecasts
 */
function getFirstWeekdayForecasts(baseDateTime, forecasts) {
  let firstWeekdayDelta = 1;
  if (_.includes([5, 6], baseDateTime.weekday)) {
    firstWeekdayDelta = 3;
  }

  const firstWeekdayMorning = baseDateTime.plus({days: firstWeekdayDelta});

  // same day
  const firstWeekdayForecasts = _.filter(forecasts,
    (forecast) => forecast.dateTime.hasSame(firstWeekdayMorning, 'day'));

  return firstWeekdayForecasts;
}
