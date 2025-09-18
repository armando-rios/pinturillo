import mongoose from 'mongoose';
import { config } from './config.ts';

export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Conectado a MongoDB exitosamente');

    mongoose.connection.on('error', error => {
      console.error('❌ Error en la conexión de MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB desconectado');
    });
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error desconectando de MongoDB:', error);
  }
};
