class WeatherForecast {
    /**
     * 
     * @param {number} msSinceEpoch 
     * @param {number} fahrenheit 
     * @param {number} windchillFahrenheit 
     * @param {Text} condition 
     */
    constructor(msSinceEpoch, fahrenheit, windchillFahrenheit, condition) {
        this.msSinceEpoch = msSinceEpoch;
        this.fahrenheit = fahrenheit;
        this.windchillFahrenheit = windchillFahrenheit;
        this.condition = condition;
    }
}

module.exports = WeatherForecast;