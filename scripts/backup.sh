#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
umask 077
mkdir -p backups
backup_stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_target="backups/mesa-stol-${backup_stamp}.json"
backup_temp=$(mktemp backups/.backup-XXXXXX)
trap 'rm -f -- "$backup_temp"' EXIT
# The app replaces diary.json atomically; a single read sees a complete version.
docker compose exec -T app node --input-type=module -e \
 'import {readFile} from "node:fs/promises"; import {validateBackup} from "./public/core.mjs"; const raw=await readFile("/data/diary.json","utf8"); validateBackup(JSON.parse(raw)); process.stdout.write(raw);' > "$backup_temp"
mv -- "$backup_temp" "$backup_target"
printf 'Copia creada: %s\n' "$backup_target"
