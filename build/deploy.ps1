aws s3 cp .\\build\\Release\\build.zip s3://biking-weather-builds;
aws lambda update-function-code --function-name BikingWeather --s3-bucket biking-weather-builds --s3-key build.zip
aws lambda update-function-configuration --function-name BikingWeather --handler 'lambda/index.handler'
