const WeatherDao = require('../WeatherDao');
const WeatherForecast = require('../models/WeatherForecast');

jest.mock('../WeatherDao');

describe('BikingWeatherTomorrow Intent', () => {
    it('calls getForecast', () => {
        const expectedForecast = new WeatherForecast(1, 1, 1, '');
        WeatherDao.mockImplementation(() => {
            return { getForecast: (state, city) => {
                return [expectedForecast];
            } };
        });
        const bikingWeatherLambda = require('../lambda');
        const mockAlexa = {
            response: {
                speak: jest.fn()
            },
            emit: jest.fn()
        };

        bikingWeatherLambda.handlers.BikingWeatherTomorrow.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).toBe(expectedForecast.condition);
    });
});