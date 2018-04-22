const convict = require('convict');
const yaml = require('js-yaml');
convict.addParser({extension: ['yml', 'yaml'], parse: yaml.safeLoad});

// Define a schema
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  wunderground: {
    apiKey: {
      doc: 'API key for Wunderground',
      default: 'd6fd8bf1d739f77d',
    },
  },
  aws: {
    dynamodb: {
      endpoint: {
        doc: 'DynamoDB endpoint',
        default: 'http://localhost:8000',
      },
    },
  },
});

// Load environment dependent configuration
const env = config.get('env');
config.loadFile('./config/' + env + '.yaml');

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
