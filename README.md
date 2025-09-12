# Pinturillo

Un juego de dibujo en tiempo real inspirado en Pictionary, construido con React, Node.js y Socket.IO.

## 🎨 Características

- Juego de dibujo multijugador en tiempo real
- Interfaz moderna construida con React
- Backend robusto con Express y Socket.IO
- Arquitectura monorepo con Turbo para desarrollo eficiente
- Soporte para múltiples salas de juego

## 🛠 Stack Tecnológico

### Frontend

- **React 19** - Biblioteca de interfaz de usuario
- **Vite** - Herramienta de construcción y desarrollo
- **TypeScript** - Tipado estático

### Backend

- **Node.js** con **Bun** - Runtime de JavaScript
- **Express** - Framework web
- **Socket.IO** - Comunicación en tiempo real
- **MongoDB** con **Mongoose** - Base de datos

### Herramientas de Desarrollo

- **Turbo** - Monorepo y sistema de construcción
- **ESLint** - Linter de código
- **Prettier** - Formateador de código
- **TypeScript** - Verificación de tipos

## 📦 Instalación

1. Clona el repositorio:

```bash
git clone <repository-url>
cd pinturillo
```

2. Instala las dependencias:

```bash
bun install
```

## 🚀 Desarrollo

### Iniciar todos los servicios en desarrollo:

```bash
bun run dev
```

### Comandos disponibles:

- `bun run dev` - Inicia el modo desarrollo para todas las aplicaciones
- `bun run build` - Construye todas las aplicaciones para producción
- `bun run lint` - Ejecuta el linter en todo el proyecto
- `bun run lint:fix` - Corrige automáticamente los errores de linting
- `bun run format` - Formatea el código con Prettier
- `bun run format:check` - Verifica el formato del código
- `bun run check-types` - Verifica los tipos de TypeScript
- `bun run test` - Ejecuta las pruebas

## 📁 Estructura del Proyecto

```
pinturillo/
├── apps/
│   ├── frontend/     # Aplicación React
│   └── backend/      # Servidor Express
├── packages/         # Paquetes compartidos (si los hay)
├── turbo.json       # Configuración de Turbo
└── package.json     # Configuración del workspace
```

## 🔧 Configuración

### Variables de Entorno

Crea archivos `.env` en las carpetas correspondientes:

**Backend (`apps/backend/.env`)**:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pinturillo
```

**Frontend (`apps/frontend/.env`)**:

```env
VITE_API_URL=http://localhost:3000
```

## 🎮 Cómo Jugar

1. Ingresa a la aplicación web
2. Únete a una sala o crea una nueva
3. Cuando sea tu turno, dibuja la palabra que te toque
4. Los otros jugadores deben adivinar lo que estás dibujando
5. ¡Gana puntos adivinando correctamente y dibujando bien!
