/**
 * api.js — CAPA DE DATOS (Google Sheets + Apps Script)
 * ======================================================
 * Centraliza todas las llamadas a la red.
 * Cualquier cambio en la estructura del Sheet o del endpoint
 * se resuelve solo aquí.
 */

'use strict';

/* =============================================================
 * 1. LEER EL INVENTARIO DESDE GOOGLE SHEETS (hoja pública)
 * ============================================================= */

let _cacheInventario = null;
let _cacheTimestamp  = 0;
const CACHE_TTL_MS   = 60_000; // 1 minuto — igual que el espejo

/**
 * Devuelve el inventario completo como array de objetos.
 * Usa cache en memoria para no re-llamar dentro del mismo minuto.
 * @returns {Promise<Object[]>}
 */
async function cargarInventario() {
  const ahora = Date.now();
  if (_cacheInventario && ahora - _cacheTimestamp < CACHE_TTL_MS) {
    return _cacheInventario;
  }

  const { SPREADSHEET_ID, API_KEY } = window.CONFIG;

  // Validar config antes de llamar
  if (!SPREADSHEET_ID || SPREADSHEET_ID.startsWith('PENDIENTE')) {
    throw new Error('config.js: SPREADSHEET_ID no está configurado. Completa la instalación.');
  }
  if (!API_KEY || API_KEY.startsWith('PENDIENTE')) {
    throw new Error('config.js: API_KEY no está configurada. Completa la instalación.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
            + `/values/Portafolio?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;

  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new Error('Sin conexión a internet o la API de Google no responde.');
  }

  // Errores conocidos de la API de Google Sheets
  if (resp.status === 400) throw new Error('API Key inválida o mal configurada en config.js.');
  if (resp.status === 403) throw new Error('API Key sin permisos o no restringida correctamente. Revisa Google Cloud Console.');
  if (resp.status === 404) throw new Error('SPREADSHEET_ID incorrecto o la hoja no es pública. Verifica que Espejo.gs haya corrido.');
  if (!resp.ok)            throw new Error(`Error de la API de Google Sheets (${resp.status}). Intenta recargar.`);

  const data = await resp.json();

  // Sheet vacío o sin datos
  if (!data.values || data.values.length < 2) {
    _cacheInventario = [];
    _cacheTimestamp  = ahora;
    return [];
  }

  const [cabeceras, ...filas] = data.values;

  // Mapeo de claves: igual que el extractor (por nombre normalizado)
  const MAPA_CLAVES = {
    id: 'id', tipo: 'tipo', proyecto: 'proyecto', barrio: 'barrio',
    precio: 'precio', canon: 'canon', area: 'area',
    habitaciones: 'habitaciones', banos: 'baños',
    parqueadero: 'parqueadero', piso: 'piso', estrato: 'estrato',
    estado: 'estado', servicio: 'servicio', credito: 'credito',
    observaciones: 'observaciones', link: 'link',
    fotos: 'fotos', captacion: 'captacion'
  };

  const keyIdx = {};
  cabeceras.forEach((h, i) => {
    const n = normTexto(h).trim().replace(/\s+/g, '_');
    Object.keys(MAPA_CLAVES).forEach(clave => {
      if (keyIdx[clave] !== undefined) return;
      const pat = normTexto(MAPA_CLAVES[clave]).replace(/\s+/g, '_');
      if (n === pat || n.startsWith(pat)) keyIdx[clave] = i;
    });
  });

  _cacheInventario = filas
    .filter(f => f.some(v => v))
    .map(f => {
      const obj = {};
      Object.keys(keyIdx).forEach(clave => {
        obj[clave] = String(f[keyIdx[clave]] || '').trim();
      });
      // Primera URL de fotos = imagen principal de la tarjeta
      const fotosRaw = obj.fotos || '';
      const fotosArr = fotosRaw.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      obj._img   = fotosArr[0] || '';
      obj._fotos = fotosArr;
      return obj;
    })
    .filter(inm => /disponible/i.test(inm.estado));

  _cacheTimestamp = ahora;
  return _cacheInventario;
}

/* =============================================================
 * 2. LEER REQUERIMIENTOS
 * ============================================================= */
async function cargarRequerimientos() {
  const { SPREADSHEET_ID, API_KEY } = window.CONFIG;
  if (!SPREADSHEET_ID || SPREADSHEET_ID.startsWith('PENDIENTE')) return [];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
            + `/values/Requerimientos?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return []; // pestaña no existe todavía → silencioso

    const data  = await resp.json();
    const [cab, ...filas] = data.values || [[]];
    const keys = (cab || []).map(c => normTexto(c).trim());

    return filas
      .filter(f => f.some(v => v))
      .map(f => {
        const obj = {};
        keys.forEach((k, i) => obj[k] = f[i] || '');
        return obj;
      })
      .filter(r => !/cerrada/i.test(r.estado));
  } catch (e) {
    return []; // sin conexión → no romper el catálogo
  }
}

/* =============================================================
 * 3. ENVIAR LEAD AL BACKEND
 * ============================================================= */

/**
 * @param {Object} datos — campos del formulario
 * @param {string} origen — 'catalogo' | 'consulta' | 'ficha:{id}'
 * @returns {Promise<{ok: boolean, mensaje: string}>}
 */
async function enviarLead(datos, origen = 'catalogo') {
  const { SCRIPT_URL, CLIENT_TOKEN } = window.CONFIG;

  if (!SCRIPT_URL || SCRIPT_URL.startsWith('PENDIENTE')) {
    return { ok: false, mensaje: 'El servicio no está configurado aún. Contacta al administrador.' };
  }

  const payload = {
    accion:  'guardarLead',
    token:   CLIENT_TOKEN,
    origen,
    ...datos,
    pagina:  window.location.href,
    ts:      new Date().toISOString(),
  };

  try {
    const resp = await fetch(SCRIPT_URL, {
      method:   'POST',
      body:     JSON.stringify(payload),
      redirect: 'follow',
    });
    const json = await resp.json();
    return { ok: json.ok !== false, mensaje: json.mensaje || '' };
  } catch (e) {
    console.error('[api] enviarLead:', e);
    return { ok: false, mensaje: 'Error de conexión. Intenta de nuevo.' };
  }
}
