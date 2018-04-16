const WeatherDao = require('../WeatherDao');
const WeatherForecast = require('../models/WeatherForecast');
const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const utils = require('./utils');
const _ = require('lodash');

const originalWeatherDao = _.clone(WeatherDao);
jest.mock('../WeatherDao');
let bikingWeatherLambda;

const mock_getForecast = jest.fn();
let originalWeatherForecastUtils = _.clone(WeatherForecastUtils);

beforeAll(() => {
    WeatherDao.mockImplementationOnce(() => {
        return {
            getForecast: mock_getForecast
        };
    });
    bikingWeatherLambda = require('../lambda');
});
afterEach(() => {
    //Reset WeatherForecastUtils mocks
    Object.keys(WeatherForecastUtils).forEach((key) => {
        WeatherForecastUtils[key] = originalWeatherForecastUtils[key];
    });
})

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
        })

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
        })

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
        const expectedForecasts = [];//TODO: actually write this test, cuz shit is acting weird.  and is hard to debug.
        mock_getForecast.mockImplementationOnce((state, city) => {
            return Promise.resolve(expectedForecasts);
        });

        const mockAlexa = utils.mockAlexa();

        await bikingWeatherLambda.handlers.NextGoodBikingWeather.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('in a day');
    });
})
