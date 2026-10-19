# dnevnik_prehrane · Mesa / Stol

Versión 1.0.0. Diario personal de comidas con informes en español y croata.

Esta versión presenta una interfaz de un diario de comidas que se puede instalar en un servidor. Contiene un modelo de traducción para crear informes bilingües. No utiliza base de datos ni necesita una clave de API de traducción.

Advertencia! Este modelo fue creado con GPT6 bajo mi supervisión. La instalación y el uso son responsabilidad del usuario final. Es importante que lea las licencias y no se use con fines comerciales. Esto sólo es un herramienta para monitorear sus ingestas. Es importante que consulte a su médico y/o nutricionista.

## Qué incluye

- Un único usuario, con contraseña. La autenticación protege la página y todas las operaciones de lectura, escritura y traducción.
- Diario en `/data/diary.json`, con escritura atómica, control de cambios concurrentes y las últimas 50 versiones en `/data/history/`.
- Traducción M2M100 418M en la CPU del servidor, en un proceso separado. Una avería del traductor no impide guardar borradores. Nota: La aplicación se puede usar sin el traductor.
- Importación de las copias JSON de la versión anterior; exportación de copias e informes bilingües HTML/PDF.
- Docker Compose, un volumen persistente para las entradas, otro para el modelo y Caddy para HTTPS.
- El sitio original alojado anteriormente no se modifica con este paquete.

## Requisitos

El paquete está preparado para Linux con Docker Engine, el complemento Docker Compose y Python 3. Como punto de partida, reserva 2 núcleos, 4 GB de RAM disponibles (preferiblemente 8 GB) y 10 GB libres para imágenes, modelo y datos. Es una estimación operativa, no una garantía de rendimiento. No necesita GPU. Valida primero en servidores ARM o con muy poca memoria; las pruebas de ejecución se hicieron en Linux x86_64.

La primera preparación descarga aproximadamente 640 MB (611 MiB) del modelo, además de las imágenes y dependencias. La duración de cada traducción dependerá de la CPU y la longitud del texto. La versión fija de Transformers.js es 3.8.1 y la revisión del modelo está fijada en `server/model.mjs`. La instalación usa el motor CPU y desactiva la descarga de CUDA/TensorRT.

Comprueba las herramientas:

```bash
docker version
docker compose version
python3 --version
```

Si no tienes Docker, sigue la guía oficial para tu distribución: https://docs.docker.com/engine/install/ y https://docs.docker.com/compose/install/linux/. Los comandos siguientes asumen que tu usuario puede ejecutar Docker. No añadas servicios ni cambies puertos ocupados sin revisar la configuración que ya tiene tu servidor.

## Instalación con dominio y HTTPS

1. Crea un subdominio, por ejemplo `diario.midominio.com`, que apunte al servidor. El registro A y, si existe, AAAA deben apuntar a direcciones correctas. Los puertos TCP 80 y 443 deben estar libres y ser accesibles. Si ya usas Nginx, Apache, Traefik o Caddy, sigue la sección de proxy existente.

2. Clona este repositorio en el servidor (necesitas Git) y configura el acceso:

```bash
git clone https://github.com/Heribertosgp/dnevnik_prehrane.git
cd dnevnik_prehrane
python3 scripts/configure.py
```

El asistente solicita dominio, usuario y contraseña. Introduce al menos 16 caracteres. La contraseña no aparece en pantalla ni se guarda en texto plano: se almacena su derivación scrypt en `secrets/owner.json`. `.env` contiene el dominio y los ajustes del modelo. El asistente se niega a sobrescribir credenciales existentes.

3. Construye la aplicación y prepara el modelo en el servidor:

```bash
docker compose build app
docker compose run --rm app npm run model:prepare
```

Espera el mensaje `Model ready`. La orden muestra dos frases de prueba y sus traducciones; no utiliza datos de tu diario. Si falla, consulta los mensajes y no des por terminada la instalación del traductor.

4. Tras una preparación correcta, edita `.env` y cambia `MODEL_OFFLINE=0` por `MODEL_OFFLINE=1`. De este modo la traducción sólo utiliza los archivos ya descargados. Si actualizas el modelo más adelante, vuelve temporalmente a `0` durante su preparación.

5. Arranca el sitio:

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=60 app caddy
```

Abre `https://diario.midominio.com` (tu dominio real). Caddy solicita y renueva el certificado HTTPS. El navegador te pedirá las credenciales del paso 2; son las de este diario, no las de ChatGPT. No compartas esa contraseña con tu nutrióloga.

El servicio `app` no publica su puerto directamente: sólo Caddy se expone a Internet. El servidor comprueba la contraseña en cada petición, además de verificar el origen de las modificaciones. `/healthz` únicamente indica si el proceso está activo y no muestra comidas ni configuración.

## Si ya tienes un proxy HTTPS

No arranques el servicio Caddy de este paquete. Configura primero el dominio y usuario con `configure.py`, construye y prepara el modelo como arriba. Después:

```bash
docker compose -f compose.yml -f compose.proxy.yml up -d app
```

La aplicación queda en `127.0.0.1:8080`, sólo accesible desde el servidor. Haz que tu proxy termine HTTPS y reenvíe a esa dirección. Debe conservar el encabezado `Authorization`, permitir cuerpos JSON de hasta 20 MB y una espera de hasta 660 segundos para la preparación/traducción. La variable `APP_ORIGIN` debe coincidir exactamente con el origen HTTPS visitado, sin barra final ni subcarpeta.

No instales este diario bajo `/diario/`: esta versión espera un dominio o subdominio propio y rutas desde `/`. Si tu proxy está en otro contenedor, debes ajustar su red de Docker; `127.0.0.1` dentro de ese contenedor no es el host.

## Prueba privada por SSH, sin dominio público

Puedes comprobarlo antes de configurar DNS. Ejecuta `configure.py` usando `diario.example.com` como dominio provisional y prepara el modelo. Luego inicia solamente la aplicación:

```bash
docker compose -f compose.yml -f compose.local.yml up -d app
```

Desde tu ordenador abre un túnel, sustituyendo usuario y servidor:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@servidor
```

Abre exactamente `http://127.0.0.1:8080` en tu ordenador. La conexión al servidor viaja por SSH. No cambies la publicación a `0.0.0.0:8080`: HTTP con contraseña sólo se utiliza aquí dentro del túnel. Para pasar a producción, configura tu dominio real y arranca la variante HTTPS, recreando el servicio con sus nuevos ajustes.

## Recuperar las entradas anteriores

1. En el sitio anterior, usando el mismo navegador y perfil donde escribiste, abre **Copias de seguridad → Descargar copia JSON**.
2. En el nuevo sitio, abre **Copias de seguridad → Seleccionar copia JSON** e importa ese archivo.
3. Comprueba varias fechas y las dos versiones de cada entrada. Conserva el archivo original.

La importación añade entradas y conserva la versión más reciente si encuentra el mismo identificador. Las traducciones incompletas siguen siendo borradores. Si los datos del navegador antiguo ya se borraron y no existe copia, el servidor nuevo no puede recuperarlos. Tampoco puede leer automáticamente el almacenamiento del dominio antiguo.

## Compartir con tu nutrióloga

Escribe en uno de los idiomas admitidos, selecciona ese idioma y pulsa **Traducir ES ↔ HR**. Revisa ambos textos, marca la revisión y guarda. El traductor admite entradas en español, croata, inglés, alemán, francés, italiano y portugués; el informe siempre utiliza español y croata.

En **Compartir informe**, elige fechas. Descarga el HTML o usa **Imprimir / PDF**. Envía ese archivo a tu nutrióloga. No incluye editor, contraseña ni conexión con tu diario. La copia no se actualiza automáticamente y quien la recibe puede reenviarla. No hay enlace público al diario.

Si la traducción falla, guarda un borrador y reintenta más tarde. Siempre revisa cantidades, negaciones y nombres de alimentos. El modelo puede equivocarse.

## Comprobar que la instalación funciona

1. Abre una ventana privada: el sitio debe solicitar usuario y contraseña. Una contraseña incorrecta no debe permitir entrar.
2. Guarda una entrada en español, tradúcela y revisa el croata. Haz también una prueba con una entrada original croata.
3. Reinicia la aplicación con `docker compose restart app`. Comprueba que la entrada sigue allí y se ve desde otro navegador al iniciar sesión.
4. Exporta un informe y una copia JSON. Comprueba la impresión/PDF en el navegador que vayas a usar.
5. Importa una copia conocida y confirma las fechas.

El paquete tiene pruebas automatizadas de autenticación, rechazo de escrituras desde otros orígenes, persistencia tras reiniciar, conflictos concurrentes, fallo seguro con archivos dañados, guardado cuando falla la traducción, validación de copias y exportación bilingüe. Se ejecutó el modelo real en español y croata, tanto con descarga como con caché en modo sin red. La construcción Docker/Caddy no pudo ejecutarse en el entorno de preparación porque no había Docker; la interfaz no se verificó en un navegador gráfico. Completa estas comprobaciones en tu servidor.

## Copias de seguridad y restauración

Los volúmenes `diary_data` y `model_cache` sobreviven al reinicio y a la recreación de contenedores. **No ejecutes `docker compose down -v`**, ya que elimina los volúmenes y con ellos el diario. La supervivencia de un volumen no protege de un fallo del disco o de la eliminación del servidor.

Además de la descarga desde la interfaz, puedes crear una copia desde el host:

```bash
bash scripts/backup.sh
```

Se crea un JSON en `backups/`, sin detener el servicio. Copia estos archivos fuera del servidor con el sistema de respaldo que uses. No incluyas los JSON en un repositorio público. Guarda también la configuración y `secrets/owner.json` en un respaldo privado. El modelo se puede volver a descargar.

Para programar copias diarias, instala una entrada de cron en la cuenta con permiso de Docker, usando la ruta real del proyecto:

```cron
15 3 * * * /bin/bash /ruta/mesa-stol-server/scripts/backup.sh >> /ruta/mesa-stol-server/backups.log 2>&1
```

Este horario usa la zona horaria del servidor. El script no borra copias antiguas; define tu política de retención y copia externa.

Para una recuperación normal, importa el JSON desde la interfaz. Para una pérdida completa, reinstala el paquete, crea nuevas credenciales si es necesario e importa la última copia.

Si `diary.json` se daña, la aplicación se niega a arrancar para no sobrescribirlo. Detén el servicio antes de intervenir. Un administrador puede montar `diary_data` en un contenedor temporal y recuperar una versión de `/data/history/`; conserva el archivo dañado y una copia del volumen antes de reemplazarlo. No se hace una restauración silenciosa.

## Mantenimiento

- Mantén una única instancia de `app` escribiendo en este volumen. La cola de escritura no está diseñada para varios contenedores simultáneos.
- Para actualizar el código, conserva `.env`, `secrets/` y los volúmenes; haz una copia y ejecuta `docker compose build app` y `docker compose up -d`.
- Para cambiar la contraseña, detén `app`, mueve `secrets/owner.json` a un respaldo privado, ejecuta `configure.py` y recrea el servicio. La configuración `.env` existente se conserva. Reinicia el navegador si sigue usando la contraseña anterior.
- No se registra el contenido de las comidas en los logs. La copia JSON y el disco del servidor sí contienen texto legible; protege el acceso al host y tus respaldos.
- El código del proyecto usa GNU GPL versión 3 (`GPL-3.0-only`); se conserva el archivo `LICENSE` del repositorio. M2M100 418M usa MIT y Transformers.js usa Apache-2.0. Consulta `THIRD_PARTY_NOTICES.md` y `DEPENDENCIES.json` para las dependencias y los avisos. No incluye servicios de terceros para traducir el contenido.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| «Origen no autorizado» | `APP_ORIGIN` debe ser exactamente el esquema, dominio y puerto que usas. No mezcles `localhost` y `127.0.0.1`. Recrea `app` al cambiar `.env`. |
| Certificado HTTPS pendiente | DNS A/AAAA, acceso a TCP 80/443, puertos ocupados y logs de Caddy. |
| «El motor se detuvo» o salida 137 | Memoria disponible. Aumenta RAM, reduce `MODEL_THREADS` o cambia de estrategia si el servidor es demasiado pequeño. |
| Traducción no encuentra archivos | Prepara el modelo con `MODEL_OFFLINE=0`; espera `Model ready` y vuelve a `1`. Conserva el volumen `model_cache`. |
| Respuesta 409 al guardar | Otro dispositivo cambió el diario. Conserva tu texto y vuelve a abrir la entrada actual antes de aplicar tus cambios. |
| Respuesta 429 al traducir | Ya hay una traducción en curso; espera. Sólo se procesa una cada vez. |
| Respuesta 429 al entrar | Veinte intentos de contraseña fallidos bloquean temporalmente la autenticación; espera diez minutos. |
| Sin espacio en disco | El guardado falla sin confirmación de éxito. Libera espacio y revisa la retención de respaldos. |

## Fuentes técnicas

- Docker Engine: https://docs.docker.com/engine/install/
- Docker Compose: https://docs.docker.com/compose/install/linux/
- Caddy y HTTPS: https://caddyserver.com/docs/automatic-https
- Inferencia en Node.js: https://huggingface.co/docs/transformers.js/tutorials/node
- Modelo, archivos y licencia: https://huggingface.co/Xenova/m2m100_418M

Las guías oficiales permiten adaptar el despliegue a tu sistema operativo. No entregues contraseñas, claves privadas SSH ni archivos de credenciales en un chat para obtener ayuda.
Si no tienes un servidor o no tienes la habilidad técnica para hacer la instalación ponte en contacto con nosotros y encontraremos juntos una solución (utiliza la función de mensaje aquí en github o cualquiera de mis datos de contacto publicados en esta cuenta).
