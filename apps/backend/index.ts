import { httpServer, connectToDatabase } from './src/app.ts';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Iniciar el servidor HTTP con Socket.IO
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📡 CORS configurado para frontend en puerto 5173`);
      console.log(`🏗️  Arquitectura feature-driven implementada`);
      console.log(`⚡ Socket.IO configurado y listo para conexiones en tiempo real`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

startServer();
