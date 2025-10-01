const AWS = require('aws-sdk');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Configurar AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1'
});

const TABLE_NAME = 'ReservasClase';

async function importCSV(csvFilePath) {
  console.log('Iniciando importación desde:', csvFilePath);
  
  const items = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Convertir cada fila del CSV al formato DynamoDB
          const item = {
            tipo: row.tipo || 'online',
            fecha_reserva: row.fecha_reserva,
            alumno: row.alumno,
            alumno_nombre: row.alumno_nombre,
            clasesReservadas: row.clasesReservadas,
            clasesTotal: row.clasesTotal,
            colegio: row.colegio,
            curso: row.curso,
            gradoCiclo: row.gradoCiclo,
            horarios: row.horarios ? JSON.parse(row.horarios).map(item => item.S) : [],
            paqueteClase: row.paqueteClase,
            precio: row.precio,
            profesor: row.profesor,
            profesor_nombre: row.profesor_nombre,
            recompensa: row.recompensa,
            status: row.status,
            stringClasesReservadas: row.stringClasesReservadas,
            tema: row.tema,
            tipoClase: row.tipoClase
          };
          
          // Eliminar campos undefined/null/empty
          Object.keys(item).forEach(key => {
            if (item[key] === undefined || item[key] === null || item[key] === '') {
              delete item[key];
            }
          });
          
          items.push(item);
        } catch (error) {
          console.error('Error parseando fila:', row);
          console.error('Error:', error.message);
          // Continuar con la siguiente fila
        }
      })
      .on('end', async () => {
        console.log(`Procesadas ${items.length} filas del CSV`);
        
        try {
          // Importar en lotes de 25 (límite de DynamoDB)
          const batchSize = 25;
          let imported = 0;
          
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            const putRequests = batch.map(item => ({
              PutRequest: {
                Item: item
              }
            }));
            
            const params = {
              RequestItems: {
                [TABLE_NAME]: putRequests
              }
            };
            
            try {
              await dynamodb.batchWrite(params).promise();
              imported += batch.length;
              console.log(`Importados ${imported}/${items.length} registros`);
            } catch (error) {
              console.error('Error en lote:', error);
              console.log('Datos del lote que falló:', batch);
            }
          }
          
          console.log('✅ Importación completada');
          resolve(imported);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Función para ejecutar la importación
async function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.error('❌ Uso: node import-reservas.js <ruta-al-archivo.csv>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error('❌ El archivo CSV no existe:', csvFile);
    process.exit(1);
  }
  
  try {
    const imported = await importCSV(csvFile);
    console.log(`🎉 Se importaron ${imported} registros exitosamente`);
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { importCSV };