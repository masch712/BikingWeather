const assert = require('assert');
const WeatherDao = require('../WeatherDao.js');

describe('WeatherDao', function() {
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
        var weatherDao = new WeatherDao;
        const forecastPromise = weatherDao.getForecast('MA', 'Woburn');
        return forecastPromise.then(function (res) {
            assert.equal(res.length, 240);
        })
        .catch(function (err) {
            assert.fail(err);
        });
    });
  });
});