import { UserConfig, UserConfigErrorHandler } from "./config";
import { BikingWeatherTomorrow, NextGoodBikingWeather } from "./weather";
import { SkillBuilders } from "ask-sdk-core";

const skillBuilder = SkillBuilders.custom();

/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    UserConfig,
    BikingWeatherTomorrow,
    NextGoodBikingWeather
  )
  .addErrorHandlers(UserConfigErrorHandler)
  .lambda();
