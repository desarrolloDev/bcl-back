const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { pk, sk, ...updates } = body;

  const updateExpr = [];
  const exprAttrValues = {};
  for (const [key, value] of Object.entries(updates)) {
    updateExpr.push(`#${key} = :${key}`);
    exprAttrValues[`:${key}`] = value;
  }

  await dynamo.update({
    TableName: process.env.TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: `SET ${updateExpr.join(', ')}`,
    ExpressionAttributeNames: Object.fromEntries(
      Object.keys(updates).map(k => [`#${k}`, k])
    ),
    ExpressionAttributeValues: exprAttrValues
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Item actualizado" })
  };
};
