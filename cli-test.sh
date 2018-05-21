aws dynamodb batch-get-item --request-items file://request-items.json --endpoint-url http://localhost:8000
aws dynamodb describe-table --table-name Forecasts --endpoint-url http://localhost:8000
aws dynamodb scan --table-name Forecasts --endpoint-url http://localhost:8000
aws dynamodb put-item --table-name Forecasts --endpoint-url http://localhost:8000 --item file://put-item.json