# ALEMANY — adaptación de catálogo HTML a Google Sheets / n8n / Cloudflare

## Qué se examinó
Recibimos `index.html`, `carretillas.html`, `carros-yegua.html`, `ruedas-y-repuestos.html`, `contacto.html`, `nosotros.html`.
**No se recibieron** las carpetas originales `css/`, `js/` e `img/`. Los HTML las necesitan para mostrar diseño e interacciones. Este paquete es un parche que **se combina** con el repositorio original; no sustituye tus imágenes ni tus scripts existentes.

## 1. Copiar archivos al repositorio GitHub
1. Trabajar en una rama de prueba (por ejemplo `integracion-sheets`).
2. Copiar los seis HTML de este kit sobre sus equivalentes del repositorio (en realidad solo cambian las 3 páginas de categorías y `contacto.html`).
3. Copiar los archivos `js/catalogo-config.js`, `js/catalogo.js` y `css/catalogo-integracion.css` **conservando** `js/funciones.js`, `js/componentes.js`, `css/estilos.css` y toda la carpeta `img/` de tu proyecto.
4. Publicar una versión de vista previa. Al inicio el catálogo seguirá viéndose desde HTML porque `apiUrl` está vacío.
5. La portada y Nosotros se mantienen sin cambios funcionales.

## 2. Google Sheets (tabla PRODUCTOS)
1. Importar `plantilla_carretillas_google_sheets.xlsx` del kit anterior a Google Sheets.
2. Borrar las **4 filas de ejemplo ficticio** (CAR-001, CAR-002, YEG-001, REP-001) de PRODUCTOS.
3. Pegar el contenido de `productos_alemany_desde_web.csv` en esa pestaña, manteniendo encabezados exactamente como el archivo. Son 10 SKU reales tomados del HTML, NO una comprobación de stock ni de precio.
4. Todos los productos parten `BORRADOR`, `visible_web=NO` y sin precio/stock hasta comprobarlos.
5. Para publicar un producto, confirma características y fija `precio_incluye_iva=SI` o `NO`, `estado=ACTIVO`, `visible_web=SI`. `modo_venta=COTIZAR` permite `precio_clp` vacío. Verifica que `CAT-CAR`, `CAT-CRG` y `CAT-REP` estén activos en CATEGORIAS.
6. **No copies rutas `img/...` en imagen_url**: el sincronizador solo acepta URLs públicas HTTPS. Los productos que ya existen en el HTML conservarán su imagen local cuando `imagen_url` esté vacío. Los productos nuevos sin imagen HTTPS mostrarán un marcador de foto pendiente.

## 3. Cloudflare: publicar catálogo JSON con Worker + KV
1. Crear una cuenta Cloudflare, un KV namespace y un Worker usando el JS entregado en el kit previo (`cloudflare_worker_catalogo.js`).
2. Asignar binding KV exactamente `CATALOGO_KV` y secreto `SYNC_TOKEN` con un token generado al azar. No introducir el token en el repositorio ni en HTML/JS públicos.
3. Configurar variable `PUBLIC_ORIGINS` con `https://www.tuempresa.cl` y/o el origen de vista previa real, separados por coma. En pruebas con `*.pages.dev`, poner el origen exacto, no asterisco.
4. Comprobar que el Worker exponga `GET /catalogo` y `POST /catalogo/sync`.
5. No utilizar KV para pagos, stock reservado ni datos de clientes.

## 4. n8n: importar y configurar sincronización
1. Importar `n8n_flujo_importable.json` del kit previo.
2. Configurar credenciales Google Sheets y seleccionar el ID real de tu documento en ambos nodos.
3. Crear una credencial de tipo Header Auth: nombre `Authorization`, valor `Bearer TU_SYNC_TOKEN`. Asignarla al HTTP Request.
4. Editar la URL de `Publicar catalogo en Cloudflare` a la URL **POST** real del Worker: `https://TU-WORKER.workers.dev/catalogo/sync`.
5. Con **al menos un producto ACTIVO, visible_web=SI y categoría activa**, ejecutar manualmente. Si falla con 0 productos, revisa las columnas de Sheets (esa salvaguarda impide vaciar por error el catálogo).
6. Abrir `https://TU-WORKER.workers.dev/catalogo` en navegador y comprobar JSON con productos.

## 5. Conectar el HTML
1. Abrir `js/catalogo-config.js` y completar `apiUrl: "https://TU-WORKER.workers.dev/catalogo"`. Es la URL pública de lectura; **no** la de `/catalogo/sync`.
2. Mantener `modo: "enriquecer"` durante la prueba. En este modo actualiza productos que coincidan por SKU y agrega nuevos; no oculta tarjetas antiguas.
3. Si ya cargaste **todo** el catálogo y quieres que retirar un producto en Sheets también lo retire de la web, cambiar a `modo: "reemplazar"`.
4. Hacer commit y publicar la vista previa Cloudflare. Revisar consola del navegador, CORS y llamadas a API.

## 6. Qué hace la integración
- Conserva el encabezado, pie, las fichas técnicas HTML actuales, estilos y enlace de WhatsApp. Las fichas actuales siguen siendo estáticas y deben mantenerse alineadas con Sheets; una segunda versión puede migrar todos sus campos a Sheets.
- Actualiza nombre, descripción corta, imagen externa HTTPS (si se define) y precio visible para SKU existentes.
- Crea tarjetas nuevas sin tocar HTML; esas nuevas tarjetas tienen detalles propios con `<details>`.
- Clasifica productos por SKU/categoría en las tres páginas actuales.
- En `contacto.html`, agrega automáticamente productos publicados al selector y precompleta el mensaje cuando se abre `?sku=...&producto=...`.
- En caso de fallo de red o falta de API, conserva el HTML original como respaldo.

## Límites y advertencias
- El formulario de contacto original **sigue usando** la lógica anterior de `js/funciones.js` (según el texto HTML, abre el programa de correo). No enviará solicitudes a Sheets hasta crear otro flujo n8n y un endpoint con controles antispam.
- El catálogo público **no** es inventario transaccional. No vender productos con pago automático ni reservar unidades basándose solo en KV.
- Los cambios en Sheets se sincronizan cada 30 minutos cuando el workflow programado está activo. No son instantáneos.
- No se pudo comprobar la apariencia final, modal original ni integración real sin `css/estilos.css`, `js/funciones.js`, `js/componentes.js` e imágenes, ni acceso a tu despliegue.
- No añadir al repositorio contraseñas, `SYNC_TOKEN`, credenciales de Google o claves de API.
