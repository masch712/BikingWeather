const WeatherDao = require('../WeatherDao.js');

describe('WeatherDao', function() {
  const weatherDao = new WeatherDao;
  describe('#getForecast(MA, Woburn)', function() {
    it('should return a forecast', function() {
        expect(process.env.APIKEY).toBeDefined();
        const forecastPromise = weatherDao.getForecastFromService('MA', 'Woburn');
        return forecastPromise.then(function (forecasts) {
            expect(forecasts.length).toBe(240);
            expect(forecasts[0].msSinceEpoch).toBeDefined();
        });
    });
  });

  describe('DynamoDB', () => {
    beforeAll(async () => {
      await weatherDao.dropTable();
      await weatherDao.createTable();
    });

    describe('putForecasts', () => {
      it('puts em', async () => {
        const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
        await weatherDao.putForecastsToDb(forecasts);
        const dbForecasts = await weatherDao.getForecasts('MA', 'Woburn');
        expect(dbForecasts).toEqual(forecasts);
      });
    })
    
  });
});
