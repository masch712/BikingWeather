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
config.loadFile('./config/' + env + '.yaml');

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
