const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

// Carga las credenciales desde el archivo JSON
const credentials = require('./bucket_key.json');

// Configura el cliente de almacenamiento de Google Cloud
const storage = new Storage({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

// Nombre del bucket
const bucketName = '2023-2-tarea3';

// Función para descargar datos del bucket y mostrarlos en consola
async function downloadFromBucket() {
  try {
    // Lista de blobs en el bucket
    const [blobs] = await storage.bucket(bucketName).getFiles();

    // Itera sobre los blobs y descárgalos
    for (const blob of blobs) {
      const [data] = await blob.download();

      // Convierte los datos a cadena y muestra en consola
      console.log(`Contenido del archivo ${blob.name}:`);
      console.log(data.toString());
    }

    console.log('Descarga completa.');
  } catch (error) {
    console.error('Error al descargar datos:', error);
  }
}

// Llama a la función para descargar datos del bucket
downloadFromBucket();
