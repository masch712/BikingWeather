const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const WeatherForecast = require('../models/WeatherForecast');
const {DateTime} = require('luxon');

describe('getCommuteForecasts', () => {
  it('filters commute times', () => {
    let forecasts = [];
    let expectedCommuteForecasts = [];
    let commuteStart = 6;
    let commuteEnd = 8;
    const baseDateTime = DateTime.local().set({hour: 0, minute: 0, second: 0, millisecond: 0});

    for (let hr = 0; hr <= 48; hr++) {
      const forecastDateTime = baseDateTime.plus({hours: hr});
      let msSinceEpoch = forecastDateTime.valueOf();
      let forecast = new WeatherForecast(msSinceEpoch, 1, 1, 'rekt', 0);
      if (forecastDateTime.hour >= commuteStart
                && forecastDateTime.hour <= commuteEnd
                && forecastDateTime.weekday != 0
                && forecastDateTime.weekday != 6
      ) {
        expectedCommuteForecasts.push(forecast);
      }
      forecasts.push(forecast);
    }

    const actualCommuteForecasts = WeatherForecastUtils.getCommuteForecasts(forecasts, commuteStart, commuteEnd);
    expect(actualCommuteForecasts).toEqual(expectedCommuteForecasts);
  });
});

describe('getFirstGoodCommuteDayForecasts', () => {
  it('returns first good commute day forecasts', () => {
    let forecasts = [];
    let expectedGoodCommuteForecasts = [];
    let commuteStart = 6;
    let commuteEnd = 8;
    const baseDateTime = DateTime.local().set({weekday: 1, hour: 0, minute: 0, second: 0, millisecond: 0});
    let goodDay = 3;
    for (let hr = 0; hr <= 24 * 7; hr++) {
      const forecastDateTime = baseDateTime.plus({hours: hr});
      let msSinceEpoch = forecastDateTime.valueOf();
      let forecast = new WeatherForecast(msSinceEpoch, WeatherForecastUtils.SWEETSPOT_MIN_TEMP-1, 1, 'rekt', 0);
      if (Math.floor(hr / 24) == goodDay) {
        forecast.fahrenheit = WeatherForecastUtils.SWEETSPOT_MIN_TEMP;
        forecast.precipitationProbability = 0;
        if (forecastDateTime.hour >= commuteStart && forecastDateTime.hour <= commuteEnd) {
          expectedGoodCommuteForecasts.push(forecast);
        }
      }
      forecasts.push(forecast);
    }

    const actual = WeatherForecastUtils.getFirstGoodCommuteDayForecasts(forecasts, commuteStart, commuteEnd);
    expect(actual).toEqual(expectedGoodCommuteForecasts);
  });
});
