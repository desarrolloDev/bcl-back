const AWS = require('aws-sdk');
// Configuración para desarrollo local vs producción
const dynamoDb = process.env.IS_OFFLINE 
  ? new AWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  : new AWS.DynamoDB.DocumentClient();

const guardarCursos = async (body) => {
  // console.log('guardarCursos2', body);
  if (!body.profesor || !body.cursos) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Profesor y cursos son requeridos" })
    };
  }

  await Promise.all(body.cursos.map(async (curso) => {
    const params = { 
      TableName: process.env.TABLE_CURSOS, 
      Item: {
        tipo: 'online',
        profesor: `${body.profesor}#${curso}`, 
        curso
      } 
    };
    // console.log('params:', params);
    await dynamoDb.put(params).promise();
  }));
}

const guardarHorarios = async (body) => {
  // console.log('guardarHorarios....');
  if (!body.profesor && !body.horarios) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Profesor y horarios son requeridos" })
    };
  }

  const horarios = body.horarios;
  const objPutItem = [];
  for (const clave of Object.keys(horarios)) {

    const listahorarios = {};

    for (const hora of horarios[clave]) {
      const item = hora.split('|');
      listahorarios[`${item[0]}|${item[1]}`] = {
        tipo: item[2],
        alumno: ''
      };
    }

    if (horarios[clave].length !== 0) {
      objPutItem.push({ 
        TableName: process.env.TABLE_HORARIOS, 
        Item: {
          tipo: 'online',
          semana_profesor: `${clave}#${body.profesor}`,
          horarios: listahorarios
        }
      });
    }
  }

  await Promise.all(objPutItem.map(async (params) => {
    // console.log('params: ', params);
    await dynamoDb.put(params).promise();
  }));
}

const dataCreate = async (body) => {
  switch (body.tipo) {
    case 'guardarCursos':
      return await guardarCursos(body);
    case 'guardarHorarios':
      return await guardarHorarios(body);
    case 'guardarReservas':
      return {
        TableName: process.env.TABLE_RESERVAS,
        Item: {
          tipo: 'online',
          alumno_profesor: `${body.alumno}#${body.profesor}`,
          fecha_reserva: new Date().toISOString(),
          status: body.status,
          status_clase: body.status_clase,
          alumno: body.alumno,
          profesor: body.profesor,
          curso: body.curso,
          colegio: body.colegio,
          gradoCiclo: body.gradoCiclo,
          tema: body.tema,
          tipoClase: body.tipoClase,
          paqueteClase: body.paqueteClase,
          precio: body.precio,
          clases: body.clases,
          primera_clase: body.primer_clase,
          recompensa: body.recompensa,
          horarios: body.horarios
        }
      };
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Método no permitido" })
      };
  }
}

exports.handler = async (event) => {
  console.log('Creating data...', event);
  const body = event.body;

  await dataCreate(body);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: "Item creado" })
  };
};
