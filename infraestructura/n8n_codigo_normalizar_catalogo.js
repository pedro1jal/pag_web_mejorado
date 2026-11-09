// Nodo n8n: "Normalizar catálogo". Modo: Run Once for All Items.
// Entrada: filas CATEGORIAS. Filas PRODUCTOS: $('Leer productos').all().
// NO modifica los datos de Sheets. Solo construye una versión pública.
const categoriasRaw = $input.all().map(x => x.json);
const productosRaw = $('Leer productos').all().map(x => x.json);

function txt(v, limit = 250) {
  return String(v ?? '').trim().slice(0, limit);
}
function entero(v, campo, sku, nullable = false) {
  if (v === undefined || v === null || String(v).trim() === '') {
    if (nullable) return null;
    throw new Error(`${campo} es obligatorio para ${sku}`);
  }
  const number = Number(v);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${campo} debe ser entero >= 0. SKU: ${sku}`);
  }
  return number;
}
function foto(v, sku) {
  const value = txt(v, 1000);
  if (!value) return null;
  // Las imágenes en el repositorio pueden referenciarse como img/modelo.jpg.
  if (/^\/?img\/[a-zA-Z0-9 _./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(value) &&
      !value.split('/').includes('..') && !value.includes('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('HTTPS requerido');
    return url.toString();
  } catch {
    throw new Error(`imagen_url inválida para ${sku}; usa img/nombre.jpg o URL HTTPS pública`);
  }
}

const categories = new Map();
for (const r of categoriasRaw) {
  const id = txt(r.categoria_id, 50);
  if (!id) continue;
  if (categories.has(id)) throw new Error(`categoria_id repetida: ${id}`);
  const nombre = txt(r.nombre, 120);
  const slug = txt(r.slug, 120);
  if (!nombre || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Categoría inválida: ${id}`);
  }
  categories.set(id, {categoria_id:id, nombre, slug, activa:txt(r.activa).toUpperCase()==='SI'});
}

const seenSku = new Set();
const seenSlug = new Set();
const productos = [];
for (const r of productosRaw) {
  const sku = txt(r.sku, 60);
  if (!sku) continue;
  if (seenSku.has(sku)) throw new Error(`SKU duplicado: ${sku}`);
  seenSku.add(sku);
  const visible = txt(r.visible_web).toUpperCase() === 'SI';
  const activo = txt(r.estado).toUpperCase() === 'ACTIVO';
  if (!visible || !activo) continue;

  const category = categories.get(txt(r.categoria_id));
  if (!category || !category.activa) continue;
  const nombre = txt(r.nombre, 160);
  const slug = txt(r.slug, 160);
  const modo_venta = txt(r.modo_venta).toUpperCase();
  if (!nombre || !/^[a-z0-9-]+$/.test(slug)) throw new Error(`nombre/slug incorrecto para ${sku}`);
  if (seenSlug.has(slug)) throw new Error(`slug repetido: ${slug}`);
  seenSlug.add(slug);
  if (!['COTIZAR','COMPRAR','AMBOS'].includes(modo_venta)) throw new Error(`modo_venta no válido: ${sku}`);
  const precio_clp = entero(r.precio_clp, 'precio_clp', sku, true);
  if ((modo_venta === 'COMPRAR' || modo_venta === 'AMBOS') && (!precio_clp || precio_clp <= 0)) {
    throw new Error(`Precio obligatorio para modo ${modo_venta}: ${sku}`);
  }
  const stock = entero(r.stock_referencia, 'stock_referencia', sku, true);
  const iva = txt(r.precio_incluye_iva).toUpperCase();
  if (!['SI','NO'].includes(iva)) throw new Error(`precio_incluye_iva debe ser SI/NO: ${sku}`);
  productos.push({
    sku, categoria_id:category.categoria_id,
    categoria_nombre:category.nombre, categoria_slug:category.slug,
    nombre, slug,
    descripcion_corta:txt(r.descripcion_corta, 300),
    descripcion_larga:txt(r.descripcion_larga, 1600),
    capacidad_kg:entero(r.capacidad_kg, 'capacidad_kg', sku, true),
    medidas_cm:txt(r.medidas_cm, 120),
    material:txt(r.material, 120),
    tipo_rueda:txt(r.tipo_rueda, 120),
    imagen_url:foto(r.imagen_url, sku),
    precio_clp, precio_incluye_iva:iva==='SI',
    disponibilidad:stock===null?'CONSULTAR':stock>0?'DISPONIBLE':'SIN_STOCK',
    modo_venta
  });
}
// Evita borrar por accidente todo el catálogo a causa de errores en filtros o conexión.
if (!productos.length) throw new Error('0 productos públicos: valida ACTIVO + SI antes de sincronizar');
productos.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
const categorias = [...categories.values()]
  .filter(c=>c.activa)
  .map(({categoria_id,nombre,slug})=>({categoria_id,nombre,slug}));
return [{json:{schema_version:1,generado_en:new Date().toISOString(),categorias,productos}}];
