const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const WeatherForecast = require('../models/WeatherForecast');
const moment = require('moment-timezone');
moment.tz.setDefault('UTC');

describe('getCommuteForecasts', () => {
    it('filters commute times', () => {
        let forecasts = [];
        let expectedCommuteForecasts = [];
        let commuteStart = 6;
        let commuteEnd = 8;
        let baseMoment = moment(0);
        for (var hr = 0; hr <= 48; hr++) {
            const forecastMoment = moment(baseMoment).add(hr, 'hours');
            let msSinceEpoch = forecastMoment.valueOf();
            let forecast = new WeatherForecast(msSinceEpoch, 1, 1, 'rekt', 0);
            if (forecastMoment.hour() >= commuteStart && forecastMoment.hour() <= commuteEnd) {
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
        let baseMoment = moment(0);
        let goodDay = 3;
        for (var hr = 0; hr <= 24 * 7; hr++) {
            const forecastMoment = moment(baseMoment).add(hr, 'hours');
            let msSinceEpoch = forecastMoment.valueOf();
            let forecast = new WeatherForecast(msSinceEpoch, WeatherForecastUtils.SWEETSPOT_MIN_TEMP-1, 1, 'rekt', 0);
            if (Math.floor(hr / 24) == goodDay) {
                forecast.fahrenheit = WeatherForecastUtils.SWEETSPOT_MIN_TEMP;
                forecast.precipitationProbability = 0;
                if (forecastMoment.hour() >= commuteStart && forecastMoment.hour() <= commuteEnd) {
                    expectedGoodCommuteForecasts.push(forecast);
                }
            }
            forecasts.push(forecast);
        }

        const actual = WeatherForecastUtils.getFirstGoodCommuteDayForecasts(forecasts, commuteStart, commuteEnd);
        expect(actual).toEqual(expectedGoodCommuteForecasts);
    });
});