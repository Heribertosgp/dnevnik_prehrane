#!/usr/bin/env python3
"""Configure a single owner. No password is printed or stored in plaintext."""
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets

root = Path(__file__).resolve().parent.parent
os.umask(0o077)
target = root / 'secrets' / 'owner.json'
if target.exists():
    raise SystemExit('Ya existe secrets/owner.json. No se ha cambiado. Consulta la guía para cambiar la contraseña.')
domain = input('Dominio (ejemplo: diario.midominio.com; sin https://): ').strip().lower()
if not re.fullmatch(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', domain):
    raise SystemExit('Introduce un dominio válido. Para probar por SSH puedes usar diario.example.com.')
username = input('Usuario [diario]: ').strip() or 'diario'
if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', username):
    raise SystemExit('El usuario sólo admite letras, números, guion y guion bajo.')
password = getpass.getpass('Contraseña (mínimo 16 caracteres): ')
if len(password) < 16:
    raise SystemExit('Utiliza al menos 16 caracteres.')
if password != getpass.getpass('Repite la contraseña: '):
    raise SystemExit('Las contraseñas no coinciden.')
salt = secrets.token_bytes(16)
digest = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=16384, r=8, p=1, dklen=32)
target.parent.mkdir(mode=0o700, exist_ok=True)
target.write_text(json.dumps({'version': 1, 'username': username, 'salt': base64.b64encode(salt).decode(), 'hash': base64.b64encode(digest).decode()}, indent=2)+'\n')
# Directory stays 0700 on the host; Docker mounts this individual hash file read-only
# so the non-root app user can read it regardless of the host account's UID.
target.chmod(0o644)
env = root / '.env'
if not env.exists():
    env.write_text(f'DOMAIN={domain}\nAPP_ORIGIN=https://{domain}\nMODEL_THREADS=2\nMODEL_OFFLINE=0\n')
print('Configuración creada. La contraseña no se ha guardado en texto plano.')
