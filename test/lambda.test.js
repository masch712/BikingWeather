const WeatherDao = require('../WeatherDao');
const WeatherForecast = require('../models/WeatherForecast');
const WeatherForecastUtils = require('../lib/WeatherForecastUtils');
const bikingWeatherLambda = require('../lambda');

jest.mock('../WeatherDao');

describe('BikingWeatherTomorrow Intent', () => {

    const mock_getForecast = jest.fn();
    beforeAll(() => {
        WeatherDao.mockImplementationOnce(() => {
            return {
                getForecast: mock_getForecast
            };
        });
    });

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

        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

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

        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

        await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('no');
    });

    it('speaks \'error\' for error', async () => {
        const expectedError = new Error('rekt');
        mock_getForecast.mockImplementationOnce((state, city) => {
            return Promise.reject(expectedError);
        });

        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

        await bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        console.log(mockAlexa.response.speak.mock.calls);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('error');
    });
});