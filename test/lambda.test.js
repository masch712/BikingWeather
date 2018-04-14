const WeatherDao = require('../WeatherDao');
const WeatherForecast = require('../models/WeatherForecast');
const WeatherForecastUtils = require('../lib/WeatherForecastUtils');

jest.mock('../WeatherDao');

describe('BikingWeatherTomorrow Intent', () => {

    it('speaks "yes" for good weather', () => {
        const expectedForecast = new WeatherForecast(1, 1, 1, '');
        WeatherDao.mockImplementation(() => {
            return { getForecast: (state, city) => {
                return [expectedForecast];
            } };
        });
        WeatherForecastUtils.getTomorrowsCommuteForecasts = jest.fn((forecasts, startHour, endHour) => {
            return [forecasts[0], forecasts[1]];
        });
        WeatherForecastUtils.isInSweetSpot = jest.fn((forecast) => {
            return true;
        })
        
        const bikingWeatherLambda = require('../lambda');
        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

        bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('yes');
    });

    it('speaks "no" for bad weather', () => {
        const expectedForecast = new WeatherForecast(1, 1, 1, '');
        WeatherDao.mockImplementation(() => {
            return { getForecast: (state, city) => {
                return [expectedForecast];
            } };
        });
        WeatherForecastUtils.getTomorrowsCommuteForecasts = jest.fn((forecasts, startHour, endHour) => {
            return [forecasts[0], forecasts[1]];
        });
        WeatherForecastUtils.isInSweetSpot = jest.fn((forecast) => {
            return false;
        })
        
        const bikingWeatherLambda = require('../lambda');
        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

        bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe('no');
    });
});