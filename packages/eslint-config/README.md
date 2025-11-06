# @pinturillo/eslint-config

Configuraciones compartidas de ESLint y Prettier para el monorepo Pinturillo.

## Uso

### ESLint - React (Frontend)

```javascript
// eslint.config.js
import reactConfig from '@pinturillo/eslint-config/react';
export default reactConfig;
```

### ESLint - Node (Backend)

```javascript
// eslint.config.js
import nodeConfig from '@pinturillo/eslint-config/node';
export default nodeConfig;
```

### Prettier

```javascript
// prettier.config.js
import prettierConfig from '@pinturillo/eslint-config/prettier';
export default prettierConfig;
```

## Configuraciones incluidas

- **base.js**: Configuración base con TypeScript y Prettier
- **react.js**: Extiende base + reglas para React (hooks, refresh)
- **node.js**: Extiende base + globales de Node.js
- **prettier.config.js**: Configuración de Prettier compartida
