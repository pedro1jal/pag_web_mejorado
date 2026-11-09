/**
 * Cloudflare Worker + KV para catálogo público.
 * Binding KV: CATALOGO_KV; Secret: SYNC_TOKEN;
 * Variable de texto: PUBLIC_ORIGINS (lista separada por coma).
 * GET /catalogo              -> catálogo público
 * POST /catalogo/sync        -> actualización solo desde n8n, token privado
 * No usar para pagos, stock en tiempo real, usuarios ni cotizaciones privadas.
 */
function cors(request, env) {
  const origin = request.headers.get('Origin');
  const allow = String(env.PUBLIC_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  return origin && allow.includes(origin)
    ? {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'}
    : {'Vary': 'Origin'};
}
function jsonResponse(obj, status, headers={}) {
  return new Response(JSON.stringify(obj), {
    status, headers:{'Content-Type':'application/json; charset=utf-8', ...headers}
  });
}
function str(v,max=200) {return String(v??'').trim().slice(0,max);}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/catalogo' && request.method === 'GET') {
      const content = await env.CATALOGO_KV.get('catalogo_publico_v1');
      if (!content) return jsonResponse({error:'Catalogo aun no publicado'},404,cors(request,env));
      return new Response(content, {headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'public, max-age=60',
        'X-Content-Type-Options':'nosniff',
        ...cors(request,env)
      }});
    }
    if (path === '/catalogo/sync' && request.method === 'POST') {
      // Se usa solo server-to-server desde n8n, nunca desde el HTML.
      if (!env.SYNC_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.SYNC_TOKEN}`) {
        return jsonResponse({error:'Unauthorized'},401);
      }
      if (!String(request.headers.get('content-type')||'').includes('application/json')) {
        return jsonResponse({error:'Content-Type debe ser application/json'},415);
      }
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 2_000_000) {
        return jsonResponse({error:'Catalogo demasiado grande'},413);
      }
      let input;
      try {input=JSON.parse(raw);} catch {return jsonResponse({error:'JSON inválido'},400);}
      if (input.schema_version!==1 || !Array.isArray(input.productos) || !Array.isArray(input.categorias)) {
        return jsonResponse({error:'Esquema inesperado'},422);
      }
      if (input.productos.length===0 || input.productos.length>1000 || input.categorias.length>100) {
        return jsonResponse({error:'Cantidad de productos/categorías incorrecta'},422);
      }
      // Lista blanca: impedimos publicar accidentalmente campos privados de Sheets.
      const ids = new Set();
      const productos=[];
      for (const p of input.productos) {
        if (!p || typeof p !== 'object') return jsonResponse({error:'Producto incorrecto'},422);
        const sku=str(p.sku,60), nombre=str(p.nombre,160), slug=str(p.slug,160);
        if (!sku || !nombre || !/^[a-z0-9-]+$/.test(slug) || ids.has(sku)) {
          return jsonResponse({error:'SKU/slug no válido o duplicado'},422);
        }
        ids.add(sku);
        const precio = p.precio_clp === null ? null : Number(p.precio_clp);
        if (precio!==null && (!Number.isSafeInteger(precio) || precio<0)) return jsonResponse({error:'Precio inválido'},422);
        productos.push({
          sku, categoria_id:str(p.categoria_id,50),
          categoria_nombre:str(p.categoria_nombre,120), categoria_slug:str(p.categoria_slug,120),
          nombre, slug, descripcion_corta:str(p.descripcion_corta,300),
          descripcion_larga:str(p.descripcion_larga,1600),
          capacidad_kg:typeof p.capacidad_kg==='number'?p.capacidad_kg:null,
          medidas_cm:str(p.medidas_cm,120), material:str(p.material,120),
          tipo_rueda:str(p.tipo_rueda,120),
          imagen_url:typeof p.imagen_url==='string' &&
            (p.imagen_url.startsWith('https://') ||
             (/^\/?img\/[a-zA-Z0-9 _./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(p.imagen_url) &&
              !p.imagen_url.split('/').includes('..') && !p.imagen_url.includes('//')))
            ? p.imagen_url : null,
          precio_clp:precio, precio_incluye_iva:p.precio_incluye_iva===true,
          disponibilidad:['CONSULTAR','DISPONIBLE','SIN_STOCK'].includes(p.disponibilidad)?p.disponibilidad:'CONSULTAR',
          modo_venta:['COTIZAR','COMPRAR','AMBOS'].includes(p.modo_venta)?p.modo_venta:'COTIZAR'
        });
      }
      const categorias=input.categorias.map(c=>({
        categoria_id:str(c.categoria_id,50),nombre:str(c.nombre,120),slug:str(c.slug,120)
      }));
      const payload={schema_version:1,generado_en:new Date().toISOString(),categorias,productos};
      await env.CATALOGO_KV.put('catalogo_publico_v1',JSON.stringify(payload));
      return jsonResponse({ok:true,productos:productos.length,publicado_en:payload.generado_en},200);
    }
    return jsonResponse({error:'Ruta no encontrada'},404);
  }
};
