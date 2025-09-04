# Pinturillo

Un juego multijugador de dibujo y adivinanza donde los jugadores se turnan para dibujar mientras otros intentan adivinar la palabra.

## Estructura del Proyecto

Este es un monorepo que contiene:

- **Frontend**: Interfaz de usuario para los jugadores
- **Backend**: Servidor para manejar las conexiones y lógica del juego

## Requisitos

- [Bun](https://bun.com) v1.2.20 o superior
- Node.js compatible

## Instalación

```bash
# Instalar dependencias
bun install
```

## Desarrollo

```bash
# Ejecutar en modo desarrollo (frontend + backend)
bun run dev

# Construir el proyecto
bun run build

# Ejecutar linter
bun run lint

# Formatear código
bun run format

# Verificar tipos
bun run check-types

# Ejecutar tests
bun run test
```

## Tecnologías

- **Runtime**: Bun
- **Build System**: Turbo (monorepo)
- **Lenguaje**: TypeScript
