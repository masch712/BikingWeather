const WeatherDao = require('../WeatherDao.js');
const _ = require('lodash');

describe('WeatherDao', function() {
  const weatherDao = new WeatherDao;
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
      expect(process.env.APIKEY).toBeDefined();
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
        await weatherDao.createTable();
      } catch (err) {
        throw err;
      }
    });

    describe('putForecasts', () => {
      it('puts em', async () => {
        const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
        const putResult = await weatherDao.putForecastsToDb(forecasts);
        expect(putResult).toEqual({UnprocessedItems: {}});
        const dbResult = await weatherDao.getForecasts('MA', 'Woburn');
        const dbForecasts = _.map(dbResult.Responses, (response) => response.forecast);
        debugger;
        expect(dbForecasts).toEqual(forecasts);
      });
    });
  });
});
