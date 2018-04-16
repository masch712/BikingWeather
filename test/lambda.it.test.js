const bikingWeatherLambda = require('../lambda');
const utils = require('./utils');

describe('NextGoodBikingWeather', () => {
    it('works', async () => {
        const mockAlexa = utils.mockAlexa();

        await bikingWeatherLambda.handlers.NextGoodBikingWeather.apply(mockAlexa);

        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(mockAlexa.response.speak.mock.calls[0][0]).not.toMatch(/Error/);
    });
});