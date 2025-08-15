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

const guardarReservas = async (body) => {
  const paramsPutItem = {
    TableName: process.env.TABLE_RESERVAS, 
    Item: {
      tipo: 'online',
      fecha_reserva: body.fecha_reserva,
      status: 'Pendiente',
      colegio: body.colegio,
      tema: body.tema,
      curso: body.curso,
      gradoCiclo: body.gradoCiclo,
      tipoClase: body.tipoClase,
      recompensa: body.recompensa,
      paqueteClase: body.paqueteClase,
      clasesReservadas: body.clasesReservadas,
      clasesTotal: body.clasesTotal,
      precio: body.precio,
      profesor: body.profesor,
      profesor_nombre: body.profesor_nombre,
      alumno: body.alumno,
      alumno_nombre: body.alumno_nombre,
      horarios: body.horarios
    }
  }
  await dynamoDb.put(paramsPutItem).promise();
}

const actualizarHorariosProf = async (body) => {
  await Promise.all(body.horarios.map(async () => {
    const horario = body.horarios.split('|');
    await dynamoDb.update({
      TableName: TABLE_HORARIOS,
      Key: { tipo: 'online', semana_profesor: `${horario[0]}#${body.profesor}` },
      UpdateExpression: `SET ${horario[1]}.${horario[2]}.alumnos = list_append(${horario[1]}.${horario[2]}.alumnos, :nuevoAlumno)`,
      ExpressionAttributeValues: {
        ':nuevoAlumno': [`${body.alumno_nombre}|${body.curso}|${body.profesor}`]
      }
    }).promise();
  }));
}

const dataCreate = async (body) => {
  switch (body.tipo) {
    case 'guardarCursos':
      return await guardarCursos(body);
    case 'guardarHorarios':
      await actualizarHorariosProf(body);
      return await guardarHorarios(body);
    case 'guardarReservas':
      return await guardarReservas(body);
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Método no permitido" })
      };
  }
}

exports.handler = async (event) => {
  // console.log('Creating data...', event);
  const body = event.body;

  await dataCreate(body);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: "Item creado" })
  };
};
