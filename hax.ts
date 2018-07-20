process.env.NODE_ENV = 'development-aws';

import { weatherDaoInstance } from "./lib/WeatherDao";

weatherDaoInstance.createTable();