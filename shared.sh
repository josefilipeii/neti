#!/bin/bash

# Navigate to the monorepo root directory
cd ./monorepo

# Create the shared module directory
mkdir -p packages/shared/src

# Create a basic tsconfig.json for the shared module
cat <<EOT > packages/shared/tsconfig.json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "moduleResolution": "Node",
    "target": "es2020",
    "module": "esnext"
  },
  "include": ["src"]
}
EOT

# Create a basic tsup.config.ts for the shared module
cat <<EOT > packages/shared/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
EOT

# Create a basic package.json for the shared module
cat <<EOT > packages/shared/package.json
{
  "name": "@shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup"
  },
  "dependencies": {}
}
EOT

# Install dependencies
pnpm install

# Build the shared module
cd packages/shared
pnpm build

# Navigate back to the monorepo root directory
cd ../../

# Update Vite configuration to support the shared module
cat <<EOT > apps/checkin/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  }
});
EOT

echo "Setup and build process completed successfully."