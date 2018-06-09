import { UserConfigIntentHandler, UserConfigErrorHandler } from "./config";
import { BikingWeatherTomorrow, NextGoodBikingWeather } from "./weather";
import { SkillBuilders } from "ask-sdk-core";

const skillBuilder = SkillBuilders.custom();

/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    UserConfigIntentHandler,
    BikingWeatherTomorrow,
    NextGoodBikingWeather
  )
  .addErrorHandlers(UserConfigErrorHandler)
  .lambda();
