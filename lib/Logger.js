const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: config.get('logging.level'),
    }),
  ],
});

module.exports = logger;
