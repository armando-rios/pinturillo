# @pinturillo/typescript-config

Configuraciones compartidas de TypeScript para el monorepo Pinturillo.

## Uso

### React (Frontend)

```json
{
  "extends": "@pinturillo/typescript-config/react.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  },
  "include": ["src"]
}
```

### Node.js (Backend)

```json
{
  "extends": "@pinturillo/typescript-config/node.json",
  "include": ["src"]
}
```

### Base (uso directo)

```json
{
  "extends": "@pinturillo/typescript-config/base.json"
}
```

## Configuraciones disponibles

- **base.json**: Configuración base con strict mode y opciones modernas
- **react.json**: Extiende base + JSX, DOM libs, y checks estrictos
- **node.json**: Extiende base + tipos de Node/Bun
