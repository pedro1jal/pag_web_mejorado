/*
 * Catálogo Alemany: mejora progresiva compatible con los HTML existentes.
 * - Sin API configurada / error: conserva el catálogo original.
 * - enriquecer: actualiza coincidencias y agrega productos nuevos, no oculta los antiguos.
 * - reemplazar: Sheets es la fuente oficial; oculta lo no publicado.
 * No recibe ni muestra información de CLIENTES, COTIZACIONES ni PEDIDOS.
 */
(() => {
  'use strict';
  const cfg = window.ALEMANY_CATALOGO || {};
  const page = document.body.dataset.catalogoPage || '';
  const grids = [...document.querySelectorAll('[data-catalogo-grupo]')];
  const API = String(cfg.apiUrl || '').trim();
  const modo = cfg.modo === 'reemplazar' ? 'reemplazar' : 'enriquecer';
  const wa = String(cfg.whatsapp || '').replace(/\D/g, '') || '56228574946';

  const texto = value => String(value ?? '').trim();
  const skuDeTarjeta = el => {
    const v = texto(el.querySelector('.producto-codigo')?.textContent);
    return v.replace(/^COD\.?\s*/i,'').toUpperCase();
  };
  const urlImagen = url => {
    const v = String(url ?? '').trim();
    if (!v) return '';
    // Ruta local segura: imágenes ya alojadas con la web en /img/.
    if (/^\/?img\/[a-zA-Z0-9 _./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(v) &&
        !v.split('/').includes('..') && !v.includes('//')) return v;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' ? u.href : '';
    } catch { return ''; }
  };
  const pesos = precio => new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0
  }).format(precio);
  const cotizarHref = p => 'https://wa.me/' + wa + '?text=' + encodeURIComponent(
    `Hola, quiero cotizar: ${texto(p.nombre)} (código ${texto(p.sku)}).`
  );
  const contactoHref = p => 'contacto.html?sku=' +
    encodeURIComponent(texto(p.sku)) + '&producto=' + encodeURIComponent(texto(p.nombre));

  function grupoDeProducto(p) {
    const cat = texto(p.categoria_slug).toLowerCase();
    const sku = texto(p.sku).toUpperCase();
    if (page === 'carretillas') {
      if (cat === 'carretillas') return 'principal';
      if (['RU-13N','RU-13M'].includes(sku)) return 'relacionados';
    }
    if (page === 'carros-yegua') {
      if (cat === 'carros-de-carga' || cat === 'yeguas') return 'principal';
      if (['RI-08','RI-10'].includes(sku)) return 'relacionados';
    }
    if (page === 'ruedas-y-repuestos' && (cat === 'repuestos' || cat === 'ruedas')) {
      if (['RU-13N','RU-13M'].includes(sku)) return 'ruedas-13';
      if (['RI-08','RI-10'].includes(sku)) return 'ruedas-industriales';
      return 'otros-repuestos';
    }
    return null;
  }

  function precioVisible(p) {
    // Al cotizar sin venta directa no se anuncia un precio cerrado al público.
    if (p.modo_venta === 'COTIZAR' || p.precio_clp == null) {
      return 'Precio según cotización · Ferreterías y cliente final';
    }
    const n = Number(p.precio_clp);
    if (!Number.isFinite(n) || n < 0) return 'Precio según cotización';
    return `${pesos(n)}${p.precio_incluye_iva ? ' IVA incluido' : ' + IVA'} · Precio referencial`;
  }

  function actualizarTarjeta(card,p) {
    const codigo = card.querySelector('.producto-codigo');
    if (codigo) codigo.textContent = 'COD. ' + texto(p.sku);
    const titulo = card.querySelector('.producto-info h3');
    if (titulo) titulo.textContent = texto(p.nombre);
    const resumen = card.querySelector('.producto-info > p:not(.precio-nota)');
    if (resumen && p.descripcion_corta) resumen.textContent = texto(p.descripcion_corta);
    const img = card.querySelector('.producto-img img');
    const src = urlImagen(p.imagen_url);
    if (img && src) img.src = src;
    if (img) img.alt = texto(p.nombre);
    const precio = card.querySelector('.precio-nota');
    if (precio) precio.textContent = precioVisible(p);
    const botonFicha = card.querySelector('[data-ficha]');
    if (botonFicha) botonFicha.dataset.nombre = texto(p.nombre);
    const enlaceWa = card.querySelector('.producto-acciones a[href*="wa.me/"]');
    if (enlaceWa) enlaceWa.href = cotizarHref(p);
    card.style.display = '';
  }

  function elemento(tag, clase, textoContenido) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (textoContenido != null) el.textContent = texto(textoContenido);
    return el;
  }

  function tarjetaNueva(p) {
    const card = elemento('article','producto producto-catalogo-dinamico');
    card.dataset.sku = texto(p.sku);
    const imagenCaja = elemento('div','producto-img');
    const src = urlImagen(p.imagen_url);
    if (src) {
      const img = elemento('img');
      img.src = src;
      img.alt = texto(p.nombre);
      img.loading = 'lazy';
      imagenCaja.append(img);
    } else {
      imagenCaja.append(elemento('div','catalogo-sin-foto','Fotografía pendiente'));
    }
    const info = elemento('div','producto-info');
    info.append(
      elemento('span','producto-codigo','COD. '+texto(p.sku)),
      elemento('h3','',p.nombre),
      elemento('p','',p.descripcion_corta || '')
    );
    const chips = elemento('ul','chips');
    for (const value of [p.medidas_cm, p.material, p.tipo_rueda].filter(Boolean)) {
      chips.append(elemento('li','',value));
    }
    if (chips.children.length) info.append(chips);
    // Reutilizar el mismo modal de ficha técnica del sitio original.
    const templateId = 'f-dyn-' + texto(p.sku).replace(/[^a-zA-Z0-9-]/g,'-').toLowerCase();
    let plantilla = document.getElementById(templateId);
    if (!plantilla) {
      plantilla = document.createElement('template');
      plantilla.id = templateId;
      const c = plantilla.content;
      c.append(
        elemento('span','producto-codigo','COD. ' + texto(p.sku)),
        elemento('h3','',p.nombre),
        elemento('p','',p.descripcion_larga || p.descripcion_corta || 'Consulta detalles con nuestra fábrica.')
      );
      const atributos = [
        ['Capacidad', p.capacidad_kg != null ? String(p.capacidad_kg) + ' kg' : ''],
        ['Medidas', p.medidas_cm],
        ['Material', p.material],
        ['Tipo de rueda', p.tipo_rueda]
      ].filter(([,v]) => v !== '' && v != null);
      if (atributos.length) {
        const tabla = elemento('table','tabla-spec');
        for (const [label,value] of atributos) {
          const fila = document.createElement('tr');
          fila.append(elemento('th','',label), elemento('td','',value));
          tabla.append(fila);
        }
        c.append(tabla);
      }
      if (src) {
        const foto = elemento('img','catalogo-ficha-imagen');
        foto.src = src;
        foto.alt = texto(p.nombre);
        foto.loading = 'lazy';
        c.prepend(foto);
      }
      document.body.append(plantilla);
    }
    const acciones = elemento('div','producto-acciones');
    const ficha = elemento('button','btn btn-linea','Ver ficha técnica');
    ficha.type = 'button';
    ficha.dataset.ficha = templateId;
    ficha.dataset.nombre = texto(p.nombre);
    const cotizar = elemento('a','btn btn-accent','Cotizar');
    cotizar.href = cotizarHref(p);
    cotizar.target = '_blank';
    cotizar.rel = 'noopener';
    const formulario = elemento('a','catalogo-contacto-link','Solicitar cotización por formulario');
    formulario.href = contactoHref(p);
    acciones.append(ficha,cotizar);
    info.append(acciones, formulario, elemento('p','precio-nota', precioVisible(p)));
    card.append(imagenCaja,info);
    return card;
  }

  function crearGrupoExtra() {
    const seccion = grids[0]?.parentElement;
    if (!seccion) return null;
    const h = elemento('h2','subtitulo-cat','Otros repuestos');
    const div = elemento('div','productos-grid');
    div.dataset.catalogoGrupo = 'otros-repuestos';
    const objetivo = grids[grids.length - 1];
    objetivo.insertAdjacentElement('afterend',div);
    div.insertAdjacentElement('beforebegin',h);
    return div;
  }

  function mostrarProductos(productos) {
    const destino = new Map(grids.map(g => [g.dataset.catalogoGrupo,g]));
    const visibles = new Map();
    for (const p of productos) {
      if (!p?.sku || !p?.nombre) continue;
      const group = grupoDeProducto(p);
      if (!group) continue;
      if (!visibles.has(group)) visibles.set(group,new Map());
      visibles.get(group).set(texto(p.sku).toUpperCase(),p);
    }
    for (const [grupo,items] of visibles) {
      if (!destino.has(grupo) && grupo === 'otros-repuestos') {
        const nuevo = crearGrupoExtra();
        if (nuevo) destino.set(grupo,nuevo);
      }
    }
    for (const [grupo,grid] of destino) {
      const disponibles = new Map(visibles.get(grupo) || []);
      const actuales = [...grid.querySelectorAll(':scope > article.producto')];
      for (const card of actuales) {
        const sku=skuDeTarjeta(card) || texto(card.dataset.sku).toUpperCase();
        const p = disponibles.get(sku);
        if (p) {
          actualizarTarjeta(card,p);
          disponibles.delete(sku);
        } else if (modo === 'reemplazar') {
          card.style.display = 'none';
        }
      }
      for (const p of disponibles.values()) grid.append(tarjetaNueva(p));
    }
  }

  function seleccionarContacto() {
    const select = document.getElementById('producto');
    if (!select) return;
    const params = new URLSearchParams(location.search);
    const name = texto(params.get('producto'));
    const sku = texto(params.get('sku'));
    if (!name && !sku) return;
    if (name && ![...select.options].some(op => op.value === name)) {
      select.add(new Option(name,name));
    }
    if (name) select.value = name;
    const mensaje = document.getElementById('mensaje');
    if (mensaje && !mensaje.value.trim()) {
      mensaje.value = 'Hola, me interesa cotizar ' + (name || 'el producto') +
        (sku ? ` (código ${sku})` : '') + '.\nCantidad: ';
    }
  }

  function actualizarSelectContacto(productos) {
    const select = document.getElementById('producto');
    if (!select) return;
    const current = select.value;
    const specials = [
      'Consulta general', 'Repuestos / otros', 'Pedido especial a medida'
    ];
    select.replaceChildren();
    for (const name of specials) select.add(new Option(name,name));
    for (const p of productos) {
      if (!p?.nombre) continue;
      if (![...select.options].some(o=>o.value===p.nombre)) {
        select.add(new Option(p.nombre,p.nombre));
      }
    }
    if ([...select.options].some(o=>o.value===current)) select.value = current;
    seleccionarContacto();
  }

  async function cargar() {
    seleccionarContacto();
    if (!API) return; // Sin API configurada, conservar HTML original.
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),8000);
    try {
      const response = await fetch(API,{headers:{Accept:'application/json'},signal:controller.signal});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.schema_version !== 1 || !Array.isArray(data.productos)) {
        throw new Error('Esquema de catálogo inválido');
      }
      if (grids.length) mostrarProductos(data.productos);
      actualizarSelectContacto(data.productos);
    } catch (err) {
      console.warn('[Alemany] Se conserva el contenido HTML original: no se pudo cargar el catálogo',err);
    } finally { clearTimeout(timeout); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar, {once:true});
  } else cargar();
})();
