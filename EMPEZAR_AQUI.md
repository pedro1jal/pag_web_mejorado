# ALEMANY — integración inicial con Google Sheets, n8n y Cloudflare

## Estado actual (importante)
Este ZIP contiene las **seis páginas HTML**, los **scripts originales** `componentes.js` y `funciones.js` (este último ajustado), el **CSS original**, y los archivos nuevos de integración. **No incluye la carpeta `img/`**, porque las imágenes se conservan en tu repositorio de GitHub. No elimines ni reemplaces esa carpeta.

El sitio funciona visualmente con sus tarjetas HTML de siempre **aunque no configures la API**. Al principio `js/catalogo-config.js` tiene `apiUrl: ""` para evitar fallos. Todavía no hay conexión real a tu cuenta, dominio, Google Sheets ni n8n.

## A. Probar cambios de código sin perder la web existente
1. En GitHub crea la rama `prueba-sheets`. Conserva `main` sin modificaciones.
2. Copia las seis páginas HTML de este ZIP al repositorio. Copia `css/estilos.css`, `css/catalogo-integracion.css`, `js/componentes.js`, `js/funciones.js`, `js/catalogo-config.js` y `js/catalogo.js` a sus carpetas. Mantén íntegra tu carpeta `img/`.
3. Prueba esa rama en una vista previa de Cloudflare Pages o un servidor local (VS Code Live Server). La portada, fichas, WhatsApp y formulario deberían verse como antes.
4. Si todavía no tienes Cloudflare, sigue el orden de los apartados B-D; no necesitas publicar en producción para comenzar a probar la API.

## B. Preparar Google Sheets
1. Sube `infraestructura/plantilla_carretillas_google_sheets.xlsx` a Google Drive. Ábrela como hoja de cálculo de Google.
2. En la pestaña `PRODUCTOS` elimina las **cuatro filas ilustrativas** (CAR-001, CAR-002, YEG-001, REP-001) conservando la primera fila de encabezados.
3. Importa o pega `productos_alemany_desde_web.csv` en `PRODUCTOS` desde la columna A y sin duplicar los encabezados. Son diez modelos basados en tus HTML; ninguna disponibilidad ni precio ha sido verificado.
4. En `CATEGORIAS` deben existir categorías activas con IDs `CAT-CAR`, `CAT-CRG`, `CAT-REP` y slugs `carretillas`, `carros-de-carga`, `repuestos`. Si la plantilla ya los contiene, no crees filas duplicadas.
5. Verifica los datos de un producto, marca `estado=ACTIVO`, `visible_web=SI`, `precio_incluye_iva=SI` o `NO`, y conserva `modo_venta=COTIZAR` si no quieres anunciar precios. Puedes dejar `precio_clp` vacío en modo COTIZAR.
6. Para imágenes ya existentes puedes poner `img/carretilla-65l.jpg` (ruta que debe existir en GitHub), o una URL pública `https://...`. Las tarjetas existentes mantienen su foto si dejas `imagen_url` vacío.

## C. Configurar Cloudflare Worker + KV
1. En Cloudflare crea un KV namespace, por ejemplo `alemany-catalogo`, y un Worker.
2. Pega el archivo `infraestructura/cloudflare_worker_catalogo.js` en el Worker.
3. En Settings/Bindings enlaza el KV bajo el nombre **exacto** `CATALOGO_KV`.
4. Crea el **secreto** `SYNC_TOKEN` como un valor largo y aleatorio; NO lo pongas en GitHub, HTML, JS público ni Sheets.
5. Agrega variable `PUBLIC_ORIGINS` con el origen exacto de la web, por ejemplo `https://ale-muestra.pages.dev,https://www.miempresa.cl` (sustituye ambos ejemplos por tus orígenes reales).
6. Despliega. La ruta `GET https://TU-WORKER.workers.dev/catalogo` puede responder 404 hasta que n8n publique la primera vez; es normal.

## D. Configurar n8n (primer flujo)
1. En n8n crea un workflow y usa "Import from File" con `infraestructura/n8n_flujo_importable.json`.
2. Abre los nodos `Leer productos` y `Leer categorias`: autentica Google, selecciona **tu** hoja de cálculo y las pestañas PRODUCTOS/CATEGORIAS.
3. En el nodo `Publicar catalogo en Cloudflare`, reemplaza la URL por `https://TU-WORKER.workers.dev/catalogo/sync` (POST, termina en `/sync`).
4. Configura credencial HTTP Header Auth: header `Authorization`, valor `Bearer EL_MISMO_SYNC_TOKEN`.
5. Ejecuta manualmente. Debe existir al menos un producto ACTIVO + visible_web=SI + categoría activa, ya que el flujo impide publicar 0 productos accidentalmente.
6. Abre `https://TU-WORKER.workers.dev/catalogo` y comprueba que aparece JSON con `schema_version:1` y un array `productos`.
7. Activa el workflow solo cuando funcione. El Schedule Trigger está puesto cada 30 minutos; los cambios no son instantáneos.

## E. Activar catálogo en HTML
1. En `js/catalogo-config.js` cambia **solamente** `apiUrl` por `https://TU-WORKER.workers.dev/catalogo` (GET; no `/sync`).
2. Mantén `modo: "enriquecer"` al principio. Los productos que no se hayan cargado aún en Sheets siguen visibles desde el HTML.
3. Publica la rama de prueba y verifica 3 casos: actualizar una tarjeta existente por SKU; agregar un producto nuevo; abrir su ficha técnica y enlace WhatsApp.
4. Cuando tengas el catálogo completo, cambia `modo` a `"reemplazar"` para que Sheets decida qué se muestra en las tarjetas. Este modo no borra HTML; oculta tarjetas no publicadas. Mantén una copia de la rama.
5. Una vez probada la vista previa, fusiona la rama a `main`.

## Cómo se comporta la versión integrada
- `funciones.js` usa **delegación de eventos**: abre la ficha técnica también para las tarjetas que se agregan después del DOMContentLoaded. Las tarjetas nuevas construyen su ficha técnica usando atributos publicados desde Sheets.
- La ficha técnica **ya existente en HTML** de productos tradicionales sigue siendo la de HTML. Si cambias un dato técnico importante en Sheets, revisa además la plantilla estática correspondiente hasta migrarla a un modelo completamente dinámico.
- `contacto.html` puede preseleccionar un producto mediante `?sku=CAR-65&producto=Carretilla%2065%20L` y cargar el select con productos publicados.
- El formulario `contacto.html` **solo abre correo (mailto)**. Todavía no envía información a n8n ni guarda cotizaciones; eso requiere el siguiente flujo y validaciones antispam.
- `COMPRAR` y `AMBOS` en Sheets son opciones para una fase futura. **No existe checkout ni pago confirmado todavía**. Los botones actuales siguen siendo de cotización.
- No expongas información privada de CLIENTES, COTIZACIONES o PEDIDOS en el JSON público.
- Google Sheets + Workers KV es adecuado para mostrar catálogos y cotizaciones iniciales, no para pagos ni inventario transaccional en tiempo real.

## Prueba rápida: si algo falla
- Se ve el HTML original y no los cambios: revisa `apiUrl` y abre la consola del navegador (F12 -> Console / Network).
- Error CORS: revisa `PUBLIC_ORIGINS` con el dominio exacto del sitio web.
- GET /catalogo devuelve 404: todavía no hubo sincronización exitosa; ejecuta n8n y verifica los registros.
- No hay productos: comprueba `CATEGORIAS.activa`, `PRODUCTOS.estado=ACTIVO`, `visible_web=SI`, y nombres exactos de las columnas.
- Foto no se ve: comprueba mayúsculas/minúsculas del nombre y ruta dentro de tu repo. En Cloudflare, `img/Carro.jpg` y `img/carro.jpg` pueden ser distintos.
- Botón de ficha técnica no funciona: usa el `js/funciones.js` incluido, no la versión anterior.

## Archivos del paquete
- `*.html` (seis páginas, solo 4 tocadas para conexión)
- `js/componentes.js`, `js/funciones.js`, `js/catalogo-config.js`, `js/catalogo.js`
- `css/estilos.css`, `css/catalogo-integracion.css`
- `productos_alemany_desde_web.csv`
- `infraestructura/` con plantilla, flujo n8n, normalizador JS, Worker.

No publiques directamente secretos ni edites la rama principal antes de probar la integración. La conexión real requiere configurar credenciales de Google, n8n y Cloudflare en tus propias cuentas.
