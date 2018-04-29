const WeatherDao = require('../lib/WeatherDao');
const config = require('../lib/config');

describe('WeatherDao', function() {
  const weatherDao = new WeatherDao();

  describe('#tableExists', () => {
    it('returns false when not exists', async () => {
      try {
        await weatherDao.dropTable();
      } catch (err) {
        console.error(err);
      }
      return weatherDao.tableExists()
        .catch((err) => {
          fail('Promise rejected; it should have resolved.  Err: ' + err);
        })
        .then((tableExists) => {
          expect(tableExists).toBeFalsy();
        });
    });
    it('returns true when exists', async () => {
      try {
        await weatherDao.createTable();
      } catch (err) {
        console.error(err);
      }
      try {
        const tableExists = await weatherDao.tableExists();
        expect(tableExists).toBeTruthy();
      } catch (err) {
        fail('Promise rejected; it should have resolved.  Err: ' + err);
      }
    });
  });

  describe('#getForecast(MA, Woburn)', function() {
    it('should return forecasts', function() {
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
        await weatherDao.putForecastsToDb(forecasts);
        const dbForecasts = await weatherDao.getForecasts('MA', 'Woburn');
        debugger;
        expect(dbForecasts.length).toBeGreaterThan(200);
        expect(dbForecasts[0].dateTime.toISO()).toEqual(forecasts[0].dateTime.toISO());
        expect(dbForecasts[0].dateTime.diff(forecasts[0].dateTime, 'hours').hours).toEqual(0);
      });
    });
    describe('getForecasts', () => {
      it('gets em', async () => {
        const forecasts = await weatherDao.getForecastFromService('MA', 'Woburn');
        await weatherDao.putForecastsToDb(forecasts);
        const dbForecasts = await weatherDao.getForecasts('MA', 'Woburn', 6, 7);

        expect(dbForecasts.length).toBeGreaterThan(17);
      });
    });
  });
});
