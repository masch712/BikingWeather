const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: config.get('logging.level'),
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
});

module.exports = logger;
