const convict = require('convict');
const yaml = require('js-yaml');
convict.addParser({extension: ['yml', 'yaml'], parse: yaml.safeLoad});
const path = require('path');

// Define a schema
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test', 'development-aws'],
    default: 'development',
    env: 'NODE_ENV',
  },
  logging: {
    level: {
      doc: 'Logging level',
      default: 'debug',
      format: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
      env: 'LOGGING_LEVEL',
    },
  },
  wunderground: {
    apiKey: {
      doc: 'API key for Wunderground',
      env: 'WUNDERGROUND_APIKEY',
      default: '',
    },
  },
  aws: {
    dynamodb: {
      endpoint: {
        doc: 'DynamoDB endpoint',
        default: 'http://localhost:8000',
      },
    },
    accessKeyId: {
      doc: 'AWS Access Key Id',
      env: 'AWS_ACCESSKEYID',
      default: 'herp',
    },
    secretAccessKey: {
      doc: 'AWS Secret Key',
      env: 'AWS_SECRETACCESSKEY',
      default: 'derp',
    },
  },
});

// Load environment dependent configuration
const env = config.get('env');
const configFile = path.resolve(__dirname, '../config/' + env + '.yaml');

config.loadFile(configFile);

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
