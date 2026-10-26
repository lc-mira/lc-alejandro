/**
 * config.js — CLIENTE: Alejandro Cadena Finanzas & Bienes Raíces
 * ================================================================
 * Proyecto:  lc-alejandro (repo privado en GitHub)
 * Dominio:   pendiente (GitHub Pages mientras tanto)
 *
 * INSTRUCCIÓN: Este es el ÚNICO archivo que cambia entre clientes.
 * Todos los demás archivos del repo son idénticos a lc-base.
 *
 * PENDIENTE al tener el dominio:
 *   - Actualizar BASE_URL con el dominio real
 *   - Agregar META_PIXEL_ID cuando Alejandro cree su Pixel
 *   - Restringir API_KEY al dominio en Google Cloud Console
 */

const CONFIG = {

  /* ----------------------------------------------------------
   * GOOGLE SHEETS
   * SPREADSHEET_ID → ID de la hoja ESPEJO PÚBLICA de Alejandro.
   * OJO: NO es el ID de la hoja Maestra. Es el ID que genera
   * Espejo.gs al ejecutar LC_instalar(). Se llena después
   * de correr la instalación.
   * ---------------------------------------------------------- */
  SPREADSHEET_ID: '1elgdDk2y1_yddHJw6yBlOlYS0eGiTXSGVHsZcvWPDfs',
  API_KEY:        'AIzaSyD9dcqg2slJPnkawSjLnLpEVdhVvmmUGrA',

  /* ----------------------------------------------------------
   * BACKEND COMPARTIDO (Apps Script del proveedor)
   * La URL se obtiene en Apps Script → Implementar → Administrar
   * implementaciones → copiar la URL del despliegue activo.
   * ---------------------------------------------------------- */
  SCRIPT_URL:   'https://script.google.com/macros/s/AKfycbyN6JNkp348we4HwW_NSWaDKqvd4AR3-_6IKclAp3fhIg8lrXc-rawTh5DvbUiSMT2E/exec',

  /* ----------------------------------------------------------
   * TOKEN DE CLIENTE
   * Identifica a Alejandro en el backend. No es secreto.
   * ---------------------------------------------------------- */
  CLIENT_TOKEN: 'cadena_01',

  /* ----------------------------------------------------------
   * META ADS
   * Dejar vacío hasta que Alejandro cree su Pixel.
   * ---------------------------------------------------------- */
  META_PIXEL_ID: '',

  /* ----------------------------------------------------------
   * CONTACTO
   * ---------------------------------------------------------- */
  WHATSAPP_NUMBER: '573168332724',

  /* ----------------------------------------------------------
   * MARCA
   * ---------------------------------------------------------- */
  MARCA_NOMBRE:    'Alejandro Cadena Finanzas & Bienes Raíces',
  MARCA_FRASE:     'Tu inversión, nuestra prioridad',
  LOGO_URL:        '',        // agregar cuando tenga logo: 'img/logo.png'
  FOTO_AGENTE_URL: '',        // agregar foto del agente: 'img/alejandro.jpg'
  COLOR_PRIMARIO:  '#0f5b4f', // verde por defecto — ajustar con el cliente
  COLOR_ACENTO:    '#e7f2ef',

  /* ----------------------------------------------------------
   * CONTEXTO
   * ---------------------------------------------------------- */
  CIUDAD:   'Cali',
  PAIS:     'Colombia',

  /* ----------------------------------------------------------
   * BASE URL
   * Durante pruebas: 'https://otayajavier.github.io/lc-alejandro'
   * Con dominio propio: 'https://catalogo.alejandrocadena.co'
   * ---------------------------------------------------------- */
  BASE_URL: 'https://lc-mira.github.io/lc-alejandro',
};

window.CONFIG = CONFIG;
