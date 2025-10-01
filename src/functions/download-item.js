const AWS = require('aws-sdk');
const XLSX = require("xlsx");
const dynamoDb = process.env.IS_OFFLINE 
  ? new AWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  : new AWS.DynamoDB.DocumentClient();

const parseFecha = (fechaStr) => {
  const [dia, mes, anio] = fechaStr.split("/").map(Number);
  return new Date(anio, mes - 1, dia);
}

const parseHora = (horaStr, baseDate) => {
  let [time, meridian] = horaStr.split(/(am|pm)/i).filter(Boolean);
  let [h, m] = time.trim().split(":").map(Number);

  if (meridian.toLowerCase() === "pm" && h < 12) h += 12;
  if (meridian.toLowerCase() === "am" && h === 12) h = 0;

  const date = new Date(baseDate);
  date.setHours(h, m, 0, 0);
  return date;
}

const estadoReserva = (cadena) => {
  const [rango, diaSemana, horario] = cadena.split("|");
  const [inicioStr, finStr] = rango.split(" - ");
  const [horaInicioStr, horaFinStr] = horario.split(" - ");

  const inicioSemana = parseFecha(inicioStr.trim());
  const finSemana = parseFecha(finStr.trim());

  const diasMap = {
    DOMINGO: 0,
    LUNES: 1,
    MARTES: 2,
    MIÉRCOLES: 3,
    MIERCOLES: 3,
    JUEVES: 4,
    VIERNES: 5,
    SÁBADO: 6,
    SABADO: 6,
  };

  let fechaClase = new Date(inicioSemana);
  while (fechaClase <= finSemana && fechaClase.getDay() !== diasMap[diaSemana]) {
    fechaClase.setDate(fechaClase.getDate() + 1);
  }

  if (fechaClase > finSemana) return "No encontrado en ese rango";

  const fechaInicio = parseHora(horaInicioStr, fechaClase);
  const fechaFin = parseHora(horaFinStr, fechaClase);

  const ahora = new Date();

  if (ahora < fechaInicio) return "Aún no empieza";
  if (ahora > fechaFin) return "Ya pasó";
  return "En curso";
}

const resumenReservas = (reservas) => {
  let yaPasaron = 0;

  for (const r of reservas) {
    const estado = estadoReserva(r);

    if (estado === "Ya pasó") yaPasaron++;
  }

  return yaPasaron;
}

exports.handler = async (event) => {
  console.log('Event completo:', JSON.stringify(event, null, 2));
  
  // Para peticiones GET, los parámetros vienen en queryStringParameters
  const body = event.query || {};
  console.log('Query params:', body);

  try {
    const desde = new Date(body.desde || "2020-01-01T00:00:00").toISOString();
    const hasta = new Date(body.hasta || "2025-07-15T23:59:59").toISOString();

    if (body.tipo == 'reservas_alumno') {
      const objSearch = {
        TableName: process.env.TABLE_RESERVAS,
        KeyConditionExpression: "tipo = :tipo AND fecha_reserva BETWEEN :desde AND :hasta",
        ExpressionAttributeValues: {
          ":tipo": 'online',
          ":desde": desde,
          ":hasta": hasta
        },
        ScanIndexForward: false
      };
    
      const dataTabla = await dynamoDb.query(objSearch).promise();
      const data = dataTabla.Items || [];
      console.log('Data:', data);

      const newData = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.status === 'Confirmado') {
          newData.push({
            "Fecha": item.fecha_reserva,
            // ID Responsable de Pago
            // Responsable de Pago
            "Alumno": item.alumno_nombre,
            "Profesor": item.profesor_nombre,
            "Tipo de clase": item.tipoClase,
            "Paquete (clases)": item.clasesTotal,
            "Monto": item.precio,
            "¿Cuantas clases se reservaron?": item.clasesReservadas,
            "¿Cuantas clases va?": resumenReservas(item.horarios)
          });
        }
      }

      const wb = XLSX.utils.book_new();

      // Crear workbook y sheet
      const ws = XLSX.utils.json_to_sheet(newData);
      XLSX.utils.book_append_sheet(wb, ws, "BD PQ de clases");

      const newDataHorarios = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.status === 'Confirmado') {
          for (let j = 0; j < item.horarios.length; j++) {
            const horario = item.horarios[j];
            console.log('Horario:', horario);
            const horarioSplit = horario.split('|');

            newDataHorarios.push({
              "Semana": horarioSplit[0] ?? '',
              "Dia": horarioSplit[1] ?? '',
              "Hora": horarioSplit[2] ?? '',
              "Tipo de clase": item.tipoClase,
              "Alumno": item.alumno_nombre,
              "Profesor": item.profesor_nombre,
              "Materia": item.curso,
              "Colegio/Universidad": item.colegio
            });
          }
        }
      }

      // Crear workbook y sheet
      const ws2 = XLSX.utils.json_to_sheet(newDataHorarios);
      XLSX.utils.book_append_sheet(wb, ws2, "Historial de Clases");

      // Generar buffer
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const base64 = buffer.toString("base64");
    
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=reporte.xlsx"
        },
        isBase64Encoded: true,
        body: base64
      };
    }

    return {
      statusCode: 200,
      body: 'Opción no válida'
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
