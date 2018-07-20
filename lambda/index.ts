import { UserConfigIntentHandler, UserConfigErrorHandler } from "./config";
import { BikingWeatherTomorrow, NextGoodBikingWeather } from "./weather";
import { SkillBuilders } from "ask-sdk-core";

const skillBuilder = SkillBuilders.custom();

/* LAMBDA SETUP */
export const handler = skillBuilder
  .addRequestHandlers(
    UserConfigIntentHandler,
    BikingWeatherTomorrow,
    NextGoodBikingWeather
  )
  .addErrorHandlers(UserConfigErrorHandler)
  .lambda();
