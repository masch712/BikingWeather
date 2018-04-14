const WeatherDao = require('../WeatherDao.js');

describe('WeatherDao', function() {
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
        expect(process.env.APIKEY).toBeDefined();
        var weatherDao = new WeatherDao;
        const forecastPromise = weatherDao.getForecast('MA', 'Woburn');
        return forecastPromise.then(function (forecasts) {
            expect(forecasts.length).toBe(240);
            expect(forecasts[0].msSinceEpoch).toBeDefined();
        });
    });
  });
});