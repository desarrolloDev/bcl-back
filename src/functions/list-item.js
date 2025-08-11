const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async () => {
  const result = await dynamo.scan({
    TableName: process.env.TABLE_NAME
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items || [])
  };
};
