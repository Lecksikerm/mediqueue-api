#!/bin/bash
set -e

echo "── Installing dependencies ──"
npm install

echo "── Building project ──"
./node_modules/.bin/nest build


echo "── Build complete ──"