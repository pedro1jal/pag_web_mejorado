/* js/componentes.js — menú, pie y botones flotantes compartidos por todas las páginas */

const TELEFONO_LINDO = "+56 2 2857 4946";
const TELEFONO_WA   = "56228574946";
const CORREO        = "pedro.alemany1@gmail.com";
const DIRECCION     = "Las Palmas #255, San Bernardo, Santiago de Chile";

const PAGINAS = [
  { href: "index.html",              label: "Inicio" },
  { href: "carretillas.html",        label: "Carretillas" },
  { href: "carros-yegua.html",       label: "Carros Yegua" },
  { href: "ruedas-y-repuestos.html", label: "Ruedas y Repuestos" },
  { href: "nosotros.html",           label: "Nosotros" },
  { href: "contacto.html",           label: "Contacto" },
];

function linkWA(texto) {
  return "https://wa.me/" + TELEFONO_WA + "?text=" + encodeURIComponent(texto);
}

function pintarHeader() {
  const actual = (location.pathname.split("/").pop() || "index.html");
  const enlaces = PAGINAS.map(p => {
    const activa = p.href === actual ? " activo" : "";
    const extra = p.href === "contacto.html" ? " btn-nav" : "";
    return `<li><a class="${activa.trim()}${extra}" href="${p.href}">${p.label}</a></li>`;
  }).join("");

  const html = `
  <div class="topbar">
    <div class="contenedor">
      <span class="dato">📞 <a href="tel:+56228574946">${TELEFONO_LINDO}</a></span>
      <span class="dato">✉️ <a href="mailto:${CORREO}">${CORREO}</a></span>
      <span class="dato">🕗 Lun–Jue 08:00–17:30 · Vie 08:00–14:00</span>
      <span class="dato">📍 San Bernardo, Las Palmas 255</span>
    </div>
  </div>
  <div class="nav-wrap">
    <a class="logo" href="index.html">ALEMANY<em>.</em><small>Fabricación chilena · +40 años</small></a>
    <nav>
      <ul id="menu">${enlaces}</ul>
    </nav>
    <button class="hamb" id="btn-hamb" aria-label="Abrir menú"><span></span><span></span><span></span></button>
  </div>
  <div class="franjas"></div>`;
  const cont = document.querySelector('[data-componente="header"]');
  if (cont) cont.innerHTML = html;
}

function pintarFooter() {
  const html = `
  <div class="franjas"></div>
  <div class="contenedor">
    <div class="footer-grid">
      <div>
        <div class="footer-marca">ALEMANY<em>.</em></div>
        <p class="desc">Fabricación chilena de carretillas, carros yegua y ruedas para el trabajo duro. Más de 40 años de experiencia, directo de fábrica.</p>
      </div>
      <div>
        <h4>Navegación</h4>
        <ul>${PAGINAS.map(p => `<li><a href="${p.href}">${p.label}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h4>Productos</h4>
        <ul>
          <li><a href="carretillas.html">Carretillas 65 y 90 L</a></li>
          <li><a href="carros-yegua.html">Carros yegua / industriales</a></li>
          <li><a href="ruedas-y-repuestos.html">Ruedas y repuestos</a></li>
          <li><a href="contacto.html">Pedidos especiales</a></li>
        </ul>
      </div>
      <div>
        <h4>Contacto</h4>
        <ul>
          <li>📍 ${DIRECCION}</li>
          <li>📞 <a href="tel:+56228574946">${TELEFONO_LINDO}</a></li>
          <li>💬 <a href="${linkWA("Hola, vengo del sitio web de Alemany y quiero hacer una consulta.")}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li>✉️ <a href="mailto:${CORREO}">${CORREO}</a></li>
          <li>🕗 Lun–Jue 08:00–17:30 · Vie 08:00–14:00</li>
        </ul>
      </div>
    </div>
    <div class="footer-bajo">
      <span>© <span id="anio"></span> Alemany — Fabricación chilena.</span>
      <span>Carretillas · Carros Yegua · Ruedas · Pedidos especiales</span>
    </div>
  </div>`;
  const cont = document.querySelector('[data-componente="footer"]');
  if (cont) cont.innerHTML = html;
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
}

function pintarFlotantes() {
  const html = `
  <a class="flotante f-wa pulso" data-etiqueta="Cotizar por WhatsApp" target="_blank" rel="noopener"
     href="${linkWA("Hola, quiero cotizar productos de Alemany.")}">
    <svg viewBox="0 0 32 32"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.3c1.5.8 3.1 1.2 4.7 1.2 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.5 0-3-.4-4.3-1.2l-.3-.2-4.3 1.4 1.4-4.2-.2-.3c-1.3-1.7-2-3.7-2-5.8 0-5.4 4.4-9.8 9.7-9.8s9.7 4.4 9.7 9.8-4.3 10.3-9.7 10.3zm5.3-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
  </a>
  <a class="flotante f-tel" data-etiqueta="Llamar ahora" href="tel:+56228574946">
    <svg viewBox="0 0 32 32"><path d="M24.6 20.2l-3.1-1.4c-.5-.2-1.1-.1-1.5.3l-1.4 1.4c-2.2-1.2-4-3-5.2-5.2l1.4-1.4c.4-.4.5-1 .3-1.5l-1.4-3.1c-.2-.6-.8-1-1.5-1H9.1c-.8 0-1.5.7-1.5 1.5C7.6 17.6 14.4 24.4 21.8 24.4c.8 0 1.5-.7 1.5-1.5v-1.2c0-.7-.4-1.3-1-1.5z" transform="scale(1.25) translate(-3 -3)"/></svg>
  </a>
  <a class="flotante f-mail" data-etiqueta="Escribir por correo" href="mailto:${CORREO}?subject=${encodeURIComponent("Consulta desde el sitio web Alemany")}">
    <svg viewBox="0 0 32 32"><path d="M27 7H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-.4 2L16 16.2 5.4 9h21.2zM5 23V11.2l10.4 7.1c.4.3.9.3 1.3 0L27 11.2V23H5z"/></svg>
  </a>`;
  let cont = document.createElement("div");
  cont.className = "flotantes";
  cont.innerHTML = html;
  document.body.appendChild(cont);

  let ruido = document.createElement("div");
  ruido.className = "ruido";
  document.body.appendChild(ruido);
}

document.addEventListener("DOMContentLoaded", () => {
  pintarHeader();
  pintarFooter();
  pintarFlotantes();
});