#!/bin/bash

# Exit script on any error
set -e

# Monorepo Root Directory
MONOREPO_NAME="monorepo"

echo "Creating monorepo: $MONOREPO_NAME"
mkdir $MONOREPO_NAME && cd $MONOREPO_NAME

# Initialize a pnpm workspace
pnpm init

# Create pnpm-workspace.yaml
cat <<EOL > pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
EOL

echo "pnpm workspace configured"

# Create apps directory and Vue 3 apps
mkdir -p apps
for app in checkin self-checkin admin-dashboard; do
  echo "Creating Vue 3 app: $app"
  pnpm create vite apps/$app --template vue-ts
done

# Install dependencies for each app
for app in checkin self-checkin admin-dashboard; do
  cd apps/$app
  pnpm install
  cd ../..
done

echo "Vue apps setup complete"

# Create shared UI package
mkdir -p packages/shared
cd packages/shared
pnpm init

# Add shared UI module (simple example)
cat <<EOL > index.ts
export const hello = () => console.log("Hello from shared package!");
EOL

# Update package.json for shared UI package
jq '.name = "@shared" | .version = "1.0.0" | .main = "index.ts"' package.json > tmp.json && mv tmp.json package.json

echo "Shared UI package created"

# Install the shared UI package in all apps
for app in checkin self-checkin admin-dashboard; do
  pnpm add @shared --workspace --filter=apps/$app
done

cd ../..

echo "Shared UI package linked to all apps"

# Install concurrently for running all apps
pnpm install -g concurrently

echo "Setup complete! You can now start all apps with:"
echo "concurrently \"pnpm --filter=apps/checkin dev\" \"pnpm --filter=apps/self-checkin dev\" \"pnpm --filter=apps/admin-dashboard dev\""
