#!/bin/bash
set -e

echo "── Installing dependencies ──"
npm install

echo "── Building project ──"
npm run build

echo "── Running migrations ──"
npm run migration:run

echo "── Build complete ──"