const WeatherDao = require('../WeatherDao.js');
const _ = require('lodash');
const config = require('../lib/config');

describe('WeatherDao', function() {
  const weatherDao = new WeatherDao;
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
      expect(config.get('wunderground.apiKey')).toBeDefined();
      const forecastPromise = weatherDao.getForecastFromService('MA', 'Woburn');
      return forecastPromise.then(function(forecasts) {
        expect(forecasts.length).toBe(240);
        expect(forecasts[0].msSinceEpoch).toBeDefined();
      });
    });
  });

  describe('DynamoDB', () => {
    beforeAll(async () => {
      try {
        await weatherDao.dropTable();
      } catch (err) {
        console.error(err);
      }
      try {
        await weatherDao.createTable();
      } catch (err) {
        throw err;
      }
    });

    describe('putForecasts', () => {
      it('puts em', async () => {
        const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
        const putResult = await weatherDao.putForecastsToDb(forecasts);
        const dbForecasts = await weatherDao.getForecasts('MA', 'Woburn');
        debugger;
        expect(dbForecasts.length).toEqual(forecasts.length);
        expect(dbForecasts[0].dateTime.toISO()).toEqual(forecasts[0].dateTime.toISO());
        expect(dbForecasts[0].dateTime.diff(forecasts[0].dateTime, 'hours').hours).toEqual(0);
        expect(dbForecasts).toEqual(forecasts);
      });
    });
  });
});
