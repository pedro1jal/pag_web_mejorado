/* js/funciones.js — VERSIÓN 2 (reemplaza el archivo completo)
   Menú, animaciones, ficha técnica CON galería interna, lightbox y formulario */

const MOVIMIENTO_REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

  /* ---- menú móvil ---- */
  const hamb = document.getElementById("btn-hamb");
  const menu = document.getElementById("menu");
  if (hamb && menu) {
    hamb.addEventListener("click", () => {
      menu.classList.toggle("abierto");
      hamb.classList.toggle("activo");
    });
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      menu.classList.remove("abierto");
      hamb.classList.remove("activo");
    }));
  }

  /* ---- aparición al hacer scroll ---- */
  const reveals = document.querySelectorAll(".reveal");
  if (MOVIMIENTO_REDUCIDO || !("IntersectionObserver" in window)) {
    reveals.forEach(el => el.classList.add("visible"));
  } else {
    const obs = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => obs.observe(el));
  }

  /* ---- contadores animados ---- */
  const cifras = document.querySelectorAll("[data-contar]");
  const animarCifra = el => {
    const fin = parseInt(el.dataset.contar, 10);
    const suf = el.dataset.sufijo || "";
    if (MOVIMIENTO_REDUCIDO) { el.textContent = fin + suf; return; }
    const dur = 1300, t0 = performance.now();
    const paso = t => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  if ("IntersectionObserver" in window && !MOVIMIENTO_REDUCIDO) {
    const obsC = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { animarCifra(e.target); obsC.unobserve(e.target); }
    }), { threshold: 0.6 });
    cifras.forEach(c => obsC.observe(c));
  } else {
    cifras.forEach(animarCifra);
  }

  /* ---- efecto decodificado en título ---- */
  const scramble = document.querySelector("[data-scramble]");
  if (scramble && !MOVIMIENTO_REDUCIDO) {
    const texto = scramble.dataset.scramble;
    const letras = "▓▒#/\\<>*+=";
    let marco = 0;
    const intervalo = setInterval(() => {
      scramble.textContent = texto.split("").map((c, i) =>
        i < marco ? c : letras[Math.floor(Math.random() * letras.length)]).join("");
      marco += 0.6;
      if (marco >= texto.length) { scramble.textContent = texto; clearInterval(intervalo); }
    }, 45);
  }

  /* ---- lightbox (se crea solo) ---- */
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = '<button class="lightbox-cerrar" aria-label="Cerrar foto">✕</button><img alt="Foto ampliada del producto">';
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector("img");
  const cerrarLight = () => lightbox.classList.remove("abierto");
  lightbox.querySelector(".lightbox-cerrar").addEventListener("click", cerrarLight);
  lightbox.addEventListener("click", e => { if (e.target === lightbox) cerrarLight(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarLight(); });

  /* ---- galería: miniaturas + zoom (se activa donde exista una galería) ---- */
  function iniciarGaleria(root) {
    root.querySelectorAll(".ficha-galeria, .galeria").forEach(gal => {
      if (gal.dataset.init) return;
      gal.dataset.init = "1";
      const principal = gal.querySelector(".galeria-principal");
      const zoom      = gal.querySelector(".galeria-zoom");
      if (!principal) return;

      gal.querySelectorAll(".mini").forEach(mini => {
        mini.addEventListener("click", () => {
          gal.querySelectorAll(".mini").forEach(m => m.classList.remove("activa"));
          mini.classList.add("activa");
          principal.classList.add("cambiando");
          const nueva   = mini.dataset.foto;
          const reserva = mini.dataset.fotoAlt || principal.src;
          setTimeout(() => {
            principal.onerror = () => { principal.onerror = null; principal.src = reserva; };
            principal.src = nueva;
            principal.classList.remove("cambiando");
          }, MOVIMIENTO_REDUCIDO ? 0 : 180);
        });
      });

      const abrir = () => { lightboxImg.src = principal.src; lightbox.classList.add("abierto"); };
      principal.addEventListener("click", abrir);
      if (zoom) zoom.addEventListener("click", abrir);
    });
  }

  /* ---- fichas técnicas (modal) con galería dentro ---- */
  const modal = document.getElementById("modal-ficha");
  if (modal) {
    const contenido = modal.querySelector(".modal-contenido");
    const accionWA  = modal.querySelector("#modal-wa");
    const cerrar    = () => { modal.classList.remove("abierto"); document.body.style.overflow = ""; };

    // Delegación: funciona también con tarjetas agregadas desde Sheets después de cargar la página.
    document.addEventListener("click", e => {
      const boton = e.target.closest("[data-ficha]");
      if (!boton) return;
      const plantilla = document.getElementById(boton.dataset.ficha);
      if (!plantilla) return;
      contenido.replaceChildren(plantilla.content.cloneNode(true));

        /* copia la galería de la tarjeta del producto hacia la ficha */
        const tarjeta = boton.closest(".producto");
        const gal = tarjeta ? tarjeta.querySelector(".galeria") : null;
        if (gal) {
          const clon = gal.cloneNode(true);
          clon.classList.remove("producto-img");
          clon.classList.add("ficha-galeria");
          delete clon.dataset.init;
          contenido.prepend(clon);
          iniciarGaleria(contenido);
        }

        const nombre = boton.dataset.nombre || "un producto";
        accionWA.href = linkWA("Hola, quiero cotizar: " + nombre + ".");
      modal.classList.add("abierto");
      document.body.style.overflow = "hidden";
    });
    modal.querySelector(".modal-cerrar").addEventListener("click", cerrar);
    modal.addEventListener("click", e => { if (e.target === modal) cerrar(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("abierto")) cerrar(); });
  }

  /* ---- formulario de contacto → correo ---- */
  const form = document.getElementById("form-contacto");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const d = new FormData(form);
      const asunto = "Cotización web — " + (d.get("producto") || "consulta general");
      const cuerpo =
        "Nombre: "  + d.get("nombre")  + "\n" +
        "Teléfono: "+ d.get("telefono") + "\n" +
        "Correo: "  + d.get("correo")  + "\n" +
        "Cliente: " + d.get("tipo")    + "\n" +
        "Producto de interés: " + d.get("producto") + "\n\n" +
        "Mensaje:\n" + d.get("mensaje");
      window.location.href = "mailto:" + CORREO +
        "?subject=" + encodeURIComponent(asunto) +
        "&body="    + encodeURIComponent(cuerpo);
    });
  }
});

// Carrusel de fotografías del taller Alemany
const imagenesTaller = [
  "img/taller/carr1.1 hd.png",
  "img/taller/carretillashd.png",
  "img/taller/carroshd.png",
  "img/taller/ruedasbodegahd.png"
];

let indiceTaller = 0;

function cambiarImagenTaller(direccion) {
  indiceTaller =
    (indiceTaller + direccion + imagenesTaller.length)
    % imagenesTaller.length;

  const imagen = document.getElementById("imagen-taller");
  const contador = document.getElementById("contador-taller");

  imagen.src = imagenesTaller[indiceTaller];
  contador.textContent =
    `${indiceTaller + 1} / ${imagenesTaller.length}`;
}