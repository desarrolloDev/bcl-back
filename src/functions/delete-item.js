const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { pk, sk } = event.queryStringParameters;

  await dynamo.delete({
    TableName: process.env.TABLE_NAME,
    Key: { pk, sk }
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Item eliminado" })
  };
};
