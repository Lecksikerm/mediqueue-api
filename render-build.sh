#!/bin/bash
set -e

echo "── Installing dependencies ──"
npm install

echo "── Building project ──"
npx nest build

echo "── Running migrations ──"
npm run migration:run

echo "── Build complete ──"