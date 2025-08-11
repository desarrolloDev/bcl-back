const AWS = require('aws-sdk');
// Configuración para desarrollo local vs producción
const dynamoDb = process.env.IS_OFFLINE 
  ? new AWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  : new AWS.DynamoDB.DocumentClient();

const dataGet = async (body) => {
  switch (body.tipo) {
    case 'cursos_profesor':
      const params = {
        TableName: process.env.TABLE_CURSOS,
        KeyConditionExpression: 'tipo = :tipo and begins_with(profesor, :profesor)',
        ExpressionAttributeValues: {
          ':tipo': 'online',
          ':profesor': `${body.profesor}#`
        }
      };
      const data = await dynamoDb.query(params).promise();
      return data.Items || [];
    case 'profesores_por_curso':
      if (!body.curso) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Curso es requerido" })
        };
      }
      const paramsCurso = {
        TableName: process.env.TABLE_CURSOS,
        IndexName: 'CursoIndex',
        KeyConditionExpression: 'tipo = :tipo and curso = :curso',
        ExpressionAttributeValues: {
          ':tipo': 'online',
          ':curso': body.curso
        }
      };
      const dataProfesores = await dynamoDb.query(paramsCurso).promise();
      return dataProfesores.Items || [];
    case 'horario_profesor':
      // console.log('horario_profesor....');
      if (!body.profesor && !body.semanas) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Profesor y semanas son requeridos" })
        };
      }

      const objGetItem = [];
      const semanas = body.semanas?.length ? body.semanas.split(',') : [];
      for (const semana of semanas) {
        objGetItem.push({
          TableName: process.env.TABLE_HORARIOS,
          KeyConditionExpression: 'tipo = :tipo and begins_with(semana_profesor, :semana_profesor)',
          ExpressionAttributeValues: {
            ':tipo': 'online',
            ':semana_profesor': `${semana}#${body.profesor}`
          }
        });
      }

      const dataSemanal = [];
      await Promise.all(objGetItem.map(async (params) => {
        // console.log('params:', params);
        const data = await dynamoDb.query(params).promise();
        dataSemanal.push(data.Items.length ? data.Items[0] : {});
      }));
      return dataSemanal;
    case 'reservas_fecha':
      const objSearch = {
        TableName: process.env.TABLE_RESERVAS,
        KeyConditionExpression: "tipo = :tipo AND fecha_reserva BETWEEN :desde AND :hasta",
        ExpressionAttributeValues: {
          ":tipo": 'online',
          ":desde": body.desde || "2020-01-01T00:00:0m0",
          ":hasta": body.hasta || "2025-07-15T23:59:59"
        }
      };
      if (body.profesor) {
        objSearch.FilterExpression = (objSearch.FilterExpression ? objSearch.FilterExpression + " AND " : "") + "profesor = :profesor";
        objSearch.ExpressionAttributeValues[":profesor"] = body.profesor;
      }
      if (body.alumno) {
        objSearch.FilterExpression = (objSearch.FilterExpression ? objSearch.FilterExpression + " AND " : "") + "alumno = :alumno";
        objSearch.ExpressionAttributeValues[":alumno"] = body.alumno;
      }
      if (body.status) {
        objSearch.FilterExpression = (objSearch.FilterExpression ? objSearch.FilterExpression + " AND " : "") + "status = :status";
        objSearch.ExpressionAttributeValues[":status"] = body.status;
      }
      return objSearch;
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Método no permitido" })
      };
  }
}

exports.handler = async (event) => {
  // console.log("event------>", event.query);

  const dataConsulta = await dataGet(event.query);
  console.log("Data consulta:", dataConsulta);

  return {
    statusCode: 200,
    body: JSON.stringify(dataConsulta || [])
  };
};
