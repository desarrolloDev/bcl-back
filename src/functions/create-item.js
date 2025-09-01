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
  if (!body.profesor && (!body.agregados || !body.eliminados)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Profesor y horarios son requeridos" })
    };
  }

  // AGREGAR NUEVOS HORARIOS EN EL REGISTRO DEL PROFESOR
  const horariosAgregados = body.agregados;

  for (const clave of Object.keys(horariosAgregados)) {
    if (horariosAgregados[clave].length !== 0) {

      const dataSemana = horariosAgregados[clave];

      // Validar si existe o no el item en la bd
      const result = await dynamoDb.get({
        TableName: process.env.TABLE_HORARIOS,
        Key: { tipo: 'online', semana_profesor: `${clave}#${body.profesor}` }
      }).promise();

      if (result.Item) {
        
        // Actualizar el horario en la semana
        for (const hora of dataSemana) {

          const item = hora.split('|');

          const params = {
            TableName: process.env.TABLE_HORARIOS,
            Key: {
              tipo: 'online',
              semana_profesor: `${clave}#${body.profesor}`
            },
            UpdateExpression: 'SET #horarios.#slot = :nuevoHorario',
            ExpressionAttributeNames: {
              '#horarios': 'horarios',
              '#slot': `${item[0]}|${item[1]}`
            },
            ExpressionAttributeValues: {
              ':nuevoHorario': {
                tipo: item[2],
                alumnos: []
              }
            }
          };
          await dynamoDb.update(params).promise();
        }

      } else {

        const listahorarios = {};

        for (const hora of dataSemana) {
          const item = hora.split('|');
          listahorarios[`${item[0]}|${item[1]}`] = {
            tipo: item[2],
            alumnos: []
          };
        }

        const objPutItem = { 
          TableName: process.env.TABLE_HORARIOS, 
          Item: {
            tipo: 'online',
            semana_profesor: `${clave}#${body.profesor}`,
            horarios: listahorarios
          }
        };
        await dynamoDb.put(objPutItem).promise();
      }
    }
  }

  // ELIMINAR HORARIOS EN EL REGISTRO DEL PROFESOR
  const horariosEliminados = body.eliminados;

  for (const clave of Object.keys(horariosEliminados)) {
    const dataSemana = horariosEliminados[clave];

    for (const hora of dataSemana) {

      const item = hora.split('|');

      const params = {
        TableName: process.env.TABLE_HORARIOS,
        Key: {
          tipo: 'online',
          semana_profesor: `${clave}#${body.profesor}`
        },
        UpdateExpression: 'REMOVE #horarios.#slot',
        ConditionExpression: 'attribute_exists(#horarios.#slot)',
        ExpressionAttributeNames: {
          '#horarios': 'horarios',
          '#slot': `${item[0]}|${item[1]}`
        }
      };
      await dynamoDb.update(params).promise();
    }
  }
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
      horarios: body.horarios,
      stringClasesReservadas: body.stringClasesReservadas ? body.stringClasesReservadas : ''
    }
  }
  await dynamoDb.put(paramsPutItem).promise();
}

const actualizarHorariosProf = async (body) => {
  await Promise.all(body.horarios.map(async (hora) => {
    const horario = hora.split('|');
    const params = {
      TableName: process.env.TABLE_HORARIOS,
      Key: {
        tipo: 'online',
        semana_profesor: `${horario[0]}#${body.profesor}`
      },
      UpdateExpression: 'SET #horarios.#slot.alumnos = list_append(#horarios.#slot.alumnos, :nuevoAlumno)',
      ExpressionAttributeNames: {
        '#horarios': 'horarios',
        '#slot': `${horario[1]}|${horario[2]}`
      },
      ExpressionAttributeValues: {
        ':nuevoAlumno': [`${body.alumno_nombre}|${body.curso}|${body.alumno}`]
      }
    };
    await dynamoDb.update(params).promise();
  }));
}

const cancelarReserva = async (body) => {
  await Promise.all(body.reservasPendientes.map(async (hora) => {

    const horario = hora.split('|');

    const result = await dynamoDb.get({
      TableName:  process.env.TABLE_HORARIOS,
      Key: {
        tipo: 'online',
        semana_profesor: `${horario[0]}#${body.profesor}`
      },
      ProjectionExpression: '#horarios.#slot.alumnos',
      ExpressionAttributeNames: {
        '#horarios': 'horarios',
        '#slot': `${horario[1]}|${horario[2]}`
      }
    }).promise();

    let alumnos = result.Item.horarios[`${horario[1]}|${horario[2]}`].alumnos;

    alumnos = alumnos.filter(a => !a.includes(body.id_alumno));

    await dynamoDb.update({
      TableName: process.env.TABLE_HORARIOS,
      Key: {
        tipo: 'online',
        semana_profesor: `${horario[0]}#${body.profesor}`
      },
      UpdateExpression: 'SET #horarios.#slot.alumnos = :nuevoArray',
      ExpressionAttributeNames: {
        '#horarios': 'horarios',
        '#slot': `${horario[1]}|${horario[2]}`
      },
      ExpressionAttributeValues: {
        ':nuevoArray': alumnos
      }
    }).promise();
  }));
}

const actualizarParamReserva = async (body) => {
  const params = {
    TableName: process.env.TABLE_RESERVAS,
    Key: {
      tipo: 'online',
      fecha_reserva: body.fecha_reserva
    },
    UpdateExpression: `SET #params = :${body.params}`,
    ExpressionAttributeNames: {
      "#params": body.params
    },
    ExpressionAttributeValues: {
      [`:${body.params}`]: body.value
    }
  };
  await dynamoDb.update(params).promise();

  if (body.params === 'status' && body.value === 'Cancelado') {
    await cancelarReserva(body);
  }
}

const actualizarHorariosAlumno = async (body) => {
  // Actualizamos los nuevos horarios del alumno
  const params = {
    TableName: process.env.TABLE_RESERVAS,
    Key: {
      tipo: 'online',
      fecha_reserva: body.fecha_reserva
    },
    UpdateExpression: `SET #clasesReservadas = :clasesReservadas, #horarios = :horarios`,
    ExpressionAttributeNames: {
      "#clasesReservadas": "clasesReservadas",
      "#horarios": "horarios"
    },
    ExpressionAttributeValues: {
      ":clasesReservadas": body.fechasTotal.length,
      ":horarios": body.fechasTotal
    }
  };
  if (body.tema) {
    params.UpdateExpression += ', #tema = :tema';
    params.ExpressionAttributeNames['#tema'] = 'tema';
    params.ExpressionAttributeValues[':tema'] = body.tema;
  }
  await dynamoDb.update(params).promise();

  // Eliminamos los horarios antiguos del profesor
  if (body.fechasEliminadas.length > 0) {
    await cancelarReserva({
      reservasPendientes: body.fechasEliminadas,
      profesor: body.profesor,
      id_alumno: body.alumno
    });
  }

  // Agregamos los nuevos horarios del profesor
  if (body.fechasNuevas.length > 0) {
    await actualizarHorariosProf({
      horarios: body.fechasNuevas,
      profesor: body.profesor,
      alumno_nombre: body.alumno_nombre,
      curso: body.curso,
      alumno: body.alumno
    });
  }
}

const dataCreate = async (body) => {
  switch (body.tipo) {
    case 'guardarCursos':
      return await guardarCursos(body);
    case 'guardarHorarios':
      return await guardarHorarios(body);
    case 'guardarReservas':
      await actualizarHorariosProf(body);
      return await guardarReservas(body);
    case 'actualizarReserva':
      await actualizarParamReserva(body);
    case 'actualizarHorariosAlumno':
      await actualizarHorariosAlumno(body);
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
