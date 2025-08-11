const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB({
  region: 'localhost',
  endpoint: 'http://localhost:8000'
});

module.exports.handler = async () => {
  console.log('Creating tables...');
  const tablas = [
    {
      TableName: "CursosProf",
      AttributeDefinitions: [
        { AttributeName: "tipo", AttributeType: "S" },
        { AttributeName: "profesor", AttributeType: "S" },
        { AttributeName: "curso", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "tipo", KeyType: "HASH" },
        { AttributeName: "profesor", KeyType: "RANGE" },
      ],
      LocalSecondaryIndexes: [
        {
          IndexName: "CursoIndex",
          KeySchema: [
            { AttributeName: "tipo", KeyType: "HASH" },
            { AttributeName: "curso", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },
    {
      TableName: "HorariosProfesor",
      AttributeDefinitions: [
        { AttributeName: "tipo", AttributeType: "S" },
        { AttributeName: "semana_profesor", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "tipo", KeyType: "HASH" },
        { AttributeName: "semana_profesor", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }
  ];

  const resultados = [];

  for (const tabla of tablas) {
    try {
      console.log('Creating table:', tabla.TableName);
      await dynamodb.createTable(tabla).promise();
      resultados.push({ tabla: tabla.TableName, estado: 'Creada' });
    } catch (error) {
      resultados.push({ tabla: tabla.TableName, estado: 'Error', detalle: error.message });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(resultados, null, 2)
  };
};
