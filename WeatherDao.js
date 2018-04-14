const superagent = require('superagent');
const _ = require('lodash');
const WeatherForecast = require('./models/WeatherForecast.js');

class WeatherDao {
    constructor() {
        //TODO: use convict for config
        this.apiKey = process.env.APIKEY;
    }

    /**
     * Returns a promise for an array of WeatherForecasts
     * @param {String} state 
     * @param {String} city 
     */
    getForecast(state, city) {
        return superagent.get("http://api.wunderground.com/api/" + this.apiKey + "/hourly10day/q/" + state + "/" + city + ".json")
        .then(handleError)
        .then(res => res.body.hourly_forecast)
        .then(wunderForecasts => {
            return _.map(wunderForecasts, (wunderForecast) => {
                return new WeatherForecast(wunderForecast.FCTTIME.epoch, wunderForecast.temp.english, wunderForecast.windchill.english, wunderForecast.condition);
            })
        });
    }
}

function handleError(res) {
    if (res.body.response.error != null) {
        throw new Error(JSON.stringify(res.body.response.error));
    }
    return res;
}

module.exports = WeatherDao;