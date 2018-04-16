const bikingWeatherLambda = require('../lambda');
const utils = require('./utils');

describe('NextGoodBikingWeather', () => {
    it('works', async () => {
        const mockAlexa = utils.mockAlexa();

        await bikingWeatherLambda.handlers.NextGoodBikingWeather.apply(mockAlexa);

        const result = mockAlexa.response.speak.mock.calls[0][0];
        console.log(result);
        expect(mockAlexa.response.speak.mock.calls.length).toBe(1);
        expect(result).not.toMatch(/Error/);
    });
});