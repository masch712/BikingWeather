import { userConfigDaoInstance } from '../lib/UserConfigDao';
const userConfigDao = userConfigDaoInstance;

import * as _ from 'lodash';
import { logger } from '../lib/Logger';
import { DateTime } from 'luxon';
import { Handler } from '../node_modules/@types/aws-lambda/index';
import { IntentRequest, Response } from "ask-sdk-model";
import { HandlerInput, ErrorHandler, SkillBuilders, RequestHandler } from "ask-sdk-core";
import { UserConfig } from '../models/UserConfig';


const APP_ID = 'amzn1.ask.skill.1fa8202d-fc67-4847-b95f-955d9eef0c22';

const SPEECH_NOT_IMPLEMENTED: string = 'Aaron says: This feature is not yet implemented.';
const STOP_MESSAGE: string = 'Bye';

export const UserConfigIntentHandler: RequestHandler = {
  canHandle: function (handlerInput: HandlerInput): Promise<boolean> | boolean {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'UserConfig'
      && request.dialogState !== 'COMPLETED';
  },
  handle: async function (handlerInput: HandlerInput): Promise<Response> {
    const request = handlerInput.requestEnvelope.request as IntentRequest;
    const intent = request.intent;
    const dialogState = request.dialogState;

    if (dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder
        .addDelegateDirective(intent)
        .getResponse();
    }

    // Put the config to the db
    const config: UserConfig = new UserConfig(
      handlerInput.requestEnvelope.session.user.userId,
      request.intent.slots.city.value,
      request.intent.slots.state.value);

    await userConfigDao.putToDb(config);

    return Promise.resolve(
      handlerInput.responseBuilder
        .speak('Thanks.')
        .getResponse());
  }
};

export const UserConfigErrorHandler: ErrorHandler = {
  canHandle(handlerInput: HandlerInput, error: Error): Promise<boolean> | boolean {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error): Promise<Response> | Response {
    console.log(`Error handled: ${handlerInput.requestEnvelope.request.type} ${handlerInput.requestEnvelope.request.type === 'IntentRequest' ? `intent: ${handlerInput.requestEnvelope.request.intent.name} ` : ''}${error.message}.`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};
