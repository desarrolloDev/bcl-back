const AWS = require('aws-sdk');

// Configurar AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1'
});

const TABLE_NAME = 'ReservasClase';

async function clearTable() {
  console.log('🧹 Limpiando tabla ReservasClase...');
  
  try {
    // Escanear todos los elementos
    const scanResult = await dynamodb.scan({
      TableName: TABLE_NAME,
      ProjectionExpression: 'tipo, fecha_reserva'
    }).promise();
    
    console.log(`Encontrados ${scanResult.Items.length} registros para eliminar`);
    
    if (scanResult.Items.length === 0) {
      console.log('✅ La tabla ya está vacía');
      return;
    }
    
    // Eliminar en lotes de 25
    const batchSize = 25;
    let deleted = 0;
    
    for (let i = 0; i < scanResult.Items.length; i += batchSize) {
      const batch = scanResult.Items.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            tipo: item.tipo,
            fecha_reserva: item.fecha_reserva
          }
        }
      }));
      
      const params = {
        RequestItems: {
          [TABLE_NAME]: deleteRequests
        }
      };
      
      await dynamodb.batchWrite(params).promise();
      deleted += batch.length;
      console.log(`Eliminados ${deleted}/${scanResult.Items.length} registros`);
    }
    
    console.log('✅ Tabla limpiada exitosamente');
  } catch (error) {
    console.error('❌ Error limpiando la tabla:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  clearTable().catch(console.error);
}

module.exports = { clearTable };