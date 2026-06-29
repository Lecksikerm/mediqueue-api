#!/bin/bash
set -e

echo "── Installing dependencies ──"
npm install

echo "── Building project ──"
./node_modules/.bin/nest build

echo "── Running migrations ──"
npm run migration:run

echo "── Build complete ──"