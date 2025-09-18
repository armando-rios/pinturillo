import { app, connectToDatabase } from './src/app.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📡 CORS configurado para frontend en puerto 5173`);
      console.log(`🏗️  Arquitectura feature-driven implementada`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

startServer();
