# Licencias y componentes de terceros

El código propio de `dnevnik_prehrane` se publica bajo **GNU GPL versión 3 solamente** (`GPL-3.0-only`). Copyright © 2026, colaboradores de dnevnik_prehrane. Se conserva íntegro el `LICENSE` inicial del repositorio. El programa se entrega sin garantía.

Las dependencias conservan sus autores, avisos y licencias originales. Compatibilidad con GPLv3 no significa que esas licencias se sustituyan por GPL. Los datos personales y los informes del usuario no se publican con el código.

## Traducción

- **M2M100 418M**, Facebook / Meta: licencia MIT según la ficha oficial de [facebook/m2m100_418M](https://huggingface.co/facebook/m2m100_418M). Aviso original: `licenses/M2M100-MIT.txt`, procedente de [fairseq](https://github.com/facebookresearch/fairseq/blob/main/LICENSE).
- Conversión ONNX de **Xenova/m2m100_418M**, revisión fija `9c374f0b7aca709787cea97b047bfbbd1559d177`: [modelo convertido](https://huggingface.co/Xenova/m2m100_418M/tree/9c374f0b7aca709787cea97b047bfbbd1559d177). La ficha identifica el modelo de Meta como origen y no declara una licencia diferente. Los pesos se descargan durante la instalación y no se incluyen en este repositorio.
- **Transformers.js 3.8.1**, Hugging Face: Apache-2.0. Su aviso se conserva en `licenses/npm-notices.txt`.
- **ONNX Runtime**, Microsoft: MIT; avisos en `licenses/ONNXRuntime-MIT.txt` y `licenses/ONNXRuntime-ThirdPartyNotices.txt` (versión 1.21.0 del motor Node). Se utiliza la CPU.

El archivo de avisos de ONNX Runtime es el documento completo del proveedor y abarca también compilaciones opcionales (por ejemplo Intel MKL); no es una lista de componentes activos del diario. Esta instalación Linux utiliza el proveedor CPU predeterminado, no MKL, CUDA ni TensorRT. Docker fija `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` y `.npmrc` desactiva esa descarga también en instalaciones npm locales. No habilites proveedores adicionales sin revisar sus condiciones.

## Dependencias npm

`DEPENDENCIES.json` registra todos los paquetes fijados por `package-lock.json`, incluidos los opcionales de otras plataformas, con versión, licencia declarada, origen e integridad. `licenses/npm-notices.txt` conserva los avisos disponibles en los paquetes instalados en Linux x86_64. Los paquetes descargados por `npm ci` mantienen también sus propios avisos; no se incluye `node_modules` en Git.

Las expresiones de licencia encontradas son MIT, Apache-2.0, BSD-3-Clause, ISC, 0BSD, BlueOak-1.0.0, LGPL-3.0-or-later y combinaciones de ellas. Para `type-fest` (`MIT OR CC0-1.0`) se elige MIT. Son utilizables en un proyecto GPLv3 conservando los avisos y cumpliendo sus condiciones.

Sharp incorpora libvips como dependencia transitiva de Transformers.js, aunque este diario sólo traduce texto. `licenses/sharp-libvips-NOTICE.md` conserva el inventario adicional del distribuidor: incluye LGPLv3, MPL-2.0, MIT, Apache-2.0 y licencias permisivas BSD, FreeType, fontconfig, libpng, libtiff, IJG y zlib, así como la licencia de patentes de AOM. Sus fuentes y recetas de compilación están en [sharp-libvips](https://github.com/lovell/sharp-libvips), con las versiones nativas en `node_modules/@img/sharp-libvips-*/versions.json`. No se modifican estas bibliotecas.

## Entorno de instalación

Node.js (MIT y avisos de sus componentes), Caddy (Apache-2.0), Python (PSF) y los sistemas base de sus imágenes se instalan por separado. Los archivos Docker/Compose son recetas; este repositorio no distribuye imágenes ni binarios de terceros. Una redistribución de imágenes o ejecutables deberá conservar sus avisos y proporcionar el código fuente correspondiente cuando lo exijan GPL/LGPL. GPLv3 del diario no reemplaza las licencias del sistema operativo ni las de estos componentes.

La interfaz utiliza fuentes del sistema e iconos SVG incluidos en su código; no descarga tipografías, imágenes ni bibliotecas de interfaz externas.

## Criterio de compatibilidad y mantenimiento

- [GNU: licencias y compatibilidad](https://www.gnu.org/licenses/license-list.html).
- [Apache: compatibilidad de Apache-2.0 con GPLv3](https://www.apache.org/licenses/GPL-compatibility.html).
- [GNU: compatibilidad y conversión de LGPL a GPL](https://www.gnu.org/licenses/license-compatibility.html).
- [Blue Oak: compatibilidad con GNU GPL](https://blueoakcouncil.org/license-faq).

La revisión se refiere a las versiones fijadas en esta publicación. Antes de actualizar paquetes, modelos o imágenes, revisa sus licencias y sus componentes incorporados y actualiza este inventario. Una licencia ausente, una restricción no comercial o una restricción de uso requiere revisión antes de incorporar el componente.
