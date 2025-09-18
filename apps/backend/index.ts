import { httpServer, connectToDatabase } from './src/app.ts';
import { config } from './src/shared/config.ts';

const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Iniciar el servidor HTTP con Socket.IO
    httpServer.listen(config.port, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${config.port}`);
      console.log(`📡 CORS configurado para: ${config.corsOrigins.join(', ')}`);
      console.log(`🏗️  Arquitectura feature-driven implementada`);
      console.log(`⚡ Socket.IO configurado y listo para conexiones en tiempo real`);
      console.log(`🗃️  MongoDB: ${config.isDevelopment() ? 'Local' : 'Remoto'}`);
      console.log(`🔧 Entorno: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

startServer();
