const WeatherDao = require('../WeatherDao.js');

describe('WeatherDao', function() {
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
        var weatherDao = new WeatherDao;
        expect(process.env.APIKEY).toBeDefined();
        const forecastPromise = weatherDao.getForecast('MA', 'Woburn');
        return forecastPromise.then(function (res) {
            expect(res.length).toBe(240);
        });
    });
  });
});