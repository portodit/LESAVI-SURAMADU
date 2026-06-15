#!/bin/bash
cd /home/ivalora/LESAVI-SURAMADU
export $(cat .env | grep -v '^#' | grep '=' | xargs) > /dev/null 2>&1
exec node artifacts/api-server/dist/index.mjs
