class WeatherForecast {
    /**
     * 
     * @param {number} msSinceEpoch 
     * @param {number} fahrenheit 
     * @param {number} windchillFahrenheit 
     * @param {Text} condition 
     * @param {number} precipitationProbability
     */
    constructor(msSinceEpoch, fahrenheit, windchillFahrenheit, condition, precipitationProbability) {
        this.msSinceEpoch = msSinceEpoch;
        this.fahrenheit = fahrenheit;
        this.windchillFahrenheit = windchillFahrenheit;
        this.condition = condition;
        this.precipitationProbability = precipitationProbability;
    }
}

module.exports = WeatherForecast;