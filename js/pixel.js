/**
 * pixel.js — META PIXEL (eventos de conversión)
 * ===============================================
 * Si CONFIG.META_PIXEL_ID está vacío, este módulo se inactiva solo
 * y no lanza ningún error. Así el sitio funciona con o sin píxel.
 *
 * Eventos que se disparan:
 *  - PageView      → al cargar la página (automático por el código base)
 *  - ViewContent   → al abrir la ficha de un inmueble
 *  - Lead          → al enviar cualquier formulario de captación
 *                    (con el mismo eventID que el servidor → Meta no lo cuenta doble)
 *  - Contact       → al hacer clic en WhatsApp (flotante o de ficha)
 *  - InitiateCheckout → al abrir la calculadora de crédito
 */

'use strict';

(function iniciarPixel() {
  const id = window.CONFIG && window.CONFIG.META_PIXEL_ID;
  if (!id) return; // sin píxel configurado → no hacer nada

  // Código base oficial de Meta Pixel
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', id);
  fbq('track', 'PageView');
})();

/* ---- API pública de eventos ---- */

/**
 * Dispara ViewContent cuando el usuario ve la ficha de un inmueble.
 * @param {Object} inm — objeto del inventario
 */
function pixelViewContent(inm) {
  if (!window.fbq) return;
  fbq('track', 'ViewContent', {
    content_name:     inm.tipo + ' en ' + inm.barrio,
    content_category: inm.tipo,
    content_ids:      [inm.id || inm.link],
    value:            parseMoneda(inm.precio),
    currency:         'COP',
  });
}

/**
 * Dispara Lead cuando se envía un formulario de captación.
 * @param {string} origen  — descripción corta del formulario
 * @param {string} eventId — el que devolvió enviarLead(); el servidor manda
 *                           el mismo a la API de Conversiones y Meta deduplica.
 */
function pixelLead(origen, eventId) {
  if (!window.fbq) return;
  if (eventId) fbq('track', 'Lead', { content_name: origen }, { eventID: eventId });
  else         fbq('track', 'Lead', { content_name: origen });
}

/** Dispara Contact cuando el usuario hace clic en WhatsApp. */
function pixelContact() {
  if (!window.fbq) return;
  fbq('track', 'Contact');
}

/** Dispara InitiateCheckout al abrir la calculadora. */
function pixelCalculadora() {
  if (!window.fbq) return;
  fbq('track', 'InitiateCheckout', { content_name: 'Calculadora de crédito' });
}
