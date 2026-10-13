/* =====================================================
   BELLA PALOMA — FUNCIONALIDAD
   Datos de demostración: reemplazar al importar catálogo.
   ===================================================== */

const PRODUCT_KEY = 'bella-paloma-products-v1';
const ORDER_KEY = 'bella-paloma-order-v1';

const sampleProducts = [
  { code: '779000000001', name: 'Sartén de acero 26 cm', wholesale: 18000, retail: 27000, stock: 3 },
  { code: '779000000002', name: 'Termo 1 litro', wholesale: 16000, retail: 25000, stock: 5 },
  { code: '779000000003', name: 'Juego de utensilios', wholesale: 8000, retail: 12000, stock: 2 }
];

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

let products = readStored(PRODUCT_KEY, sampleProducts);
let order = readStored(ORDER_KEY, {});
let selectedCode = null;
let cameraStream = null;
let scanTimer = null;
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2
}).format(Number(value) || 0);

function save() {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function showView(name) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${name}-view`);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  if (name === 'catalog') renderCatalog();
  if (name === 'order') renderOrder();
  if (name === 'detail') renderDetail();
  window.scrollTo(0, 0);
}

function productCard(product) {
  const code = escapeHTML(product.code);
  return `
    <article class="product-card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>Código: ${code}</p>
      <p>Stock: ${product.stock === null ? 'Sin registrar' : product.stock}</p>
      <div class="product-prices">
        <div><small>Mayorista</small><strong>${money(product.wholesale)}</strong></div>
        <div><small>Minorista</small><strong>${money(product.retail)}</strong></div>
      </div>
      <div class="card-actions">
        <button class="secondary-button" data-detail="${code}">Ver producto</button>
        <button class="primary-button" data-add="${code}">+ Pedir</button>
      </div>
    </article>`;
}

function renderCatalog() {
  const term = $('#catalog-search').value.trim().toLocaleLowerCase('es-AR');
  const filtered = products.filter((product) =>
    product.name.toLocaleLowerCase('es-AR').includes(term) ||
    product.code.toLocaleLowerCase('es-AR').includes(term)
  );
  $('#catalog-list').innerHTML = filtered.length
    ? filtered.map(productCard).join('')
    : '<p class="empty-state">No se encontraron productos.</p>';
}

function renderDetail() {
  const product = products.find((item) => item.code === selectedCode);
  if (!product) { showView('catalog'); return; }
  $('#detail-content').innerHTML = `
    <article class="detail-card">
      <h1>${escapeHTML(product.name)}</h1>
      <p>Código: ${escapeHTML(product.code)}</p>
      <p>Stock: ${product.stock === null ? 'Sin registrar' : product.stock}</p>
      <div class="product-prices">
        <div><small>Precio mayorista</small><strong>${money(product.wholesale)}</strong></div>
        <div><small>Precio minorista</small><strong>${money(product.retail)}</strong></div>
      </div>
      <div class="quantity-line"><label for="detail-quantity">Cantidad a pedir:</label><input id="detail-quantity" type="number" min="1" step="1" value="1" /></div>
      <button class="primary-button" id="detail-add">Agregar al pedido</button>
      <button class="secondary-button" id="detail-edit">Editar producto</button>
    </article>`;
  $('#detail-add').addEventListener('click', () => {
    addToOrder(product.code, Number($('#detail-quantity').value));
  });
  $('#detail-edit').addEventListener('click', () => editProduct(product.code));
}

function addToOrder(code, quantity = 1) {
  if (!products.some((product) => product.code === code)) return;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    notify('Ingresá una cantidad válida.');
    return;
  }
  order[code] = (order[code] || 0) + quantity;
  save();
  updateCount();
  notify('Producto agregado al pedido.');
}

function updateCount() {
  const count = Object.keys(order).length;
  $('#order-count').textContent = count;
  $('#order-count').hidden = count === 0;
}

function renderOrder() {
  const items = products.filter((product) => order[product.code] > 0);
  $('#order-list').innerHTML = items.length ? items.map((product) => `
    <article class="product-card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>${escapeHTML(product.code)} · Mayorista ${money(product.wholesale)}</p>
      <div class="quantity-line">
        <label for="qty-${escapeHTML(product.code)}">Cantidad:</label>
        <input id="qty-${escapeHTML(product.code)}" data-quantity="${escapeHTML(product.code)}" type="number" min="1" step="1" value="${order[product.code]}" />
      </div>
      <button class="secondary-button" data-remove="${escapeHTML(product.code)}">Quitar</button>
    </article>`).join('') : '<p class="empty-state">Todavía no agregaste productos al pedido.</p>';
  const total = items.reduce((sum, product) => sum + product.wholesale * order[product.code], 0);
  $('#order-total').textContent = money(total);
  $('#export-button').disabled = items.length === 0;
  $('#clear-order').disabled = items.length === 0;
}

function editProduct(code) {
  const product = products.find((item) => item.code === code);
  if (!product) return;
  $('#edit-original-code').value = code;
  $('#product-code').value = product.code;
  $('#product-name').value = product.name;
  $('#product-wholesale').value = product.wholesale;
  $('#product-retail').value = product.retail;
  $('#product-stock').value = product.stock ?? '';
  $('#save-product').textContent = 'Guardar cambios';
  $('#cancel-edit').hidden = false;
  showView('admin');
}

function resetForm() {
  $('#product-form').reset();
  $('#edit-original-code').value = '';
  $('#save-product').textContent = 'Guardar producto';
  $('#cancel-edit').hidden = true;
}

function exportOrder() {
  const items = products.filter((product) => order[product.code] > 0);
  if (!items.length) return;
  const csvCell = (value) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const rows = [
    ['Código', 'Producto', 'Cantidad', 'Precio mayorista', 'Subtotal'],
    ...items.map((product) => [product.code, product.name, order[product.code], product.wholesale, product.wholesale * order[product.code]])
  ];
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pedido-bella-paloma-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Pedido descargado. La lista se conserva.');
}

function stopCamera() {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (cameraStream) { cameraStream.getTracks().forEach((track) => track.stop()); cameraStream = null; }
  $('#camera-preview').srcObject = null;
  $('#camera-preview').hidden = true;
}

function closeScanner() {
  stopCamera();
  $('#scan-dialog').close();
}

function lookupCode(code) {
  const product = products.find((item) => item.code === code.trim());
  if (!product) { $('#scan-message').textContent = 'Código no encontrado. Podés agregarlo desde Administrar.'; return; }
  selectedCode = product.code;
  closeScanner();
  showView('detail');
}

async function startCamera() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
    $('#scan-message').textContent = 'Este navegador no admite escaneo automático. Ingresá el código manualmente.';
    return;
  }
  try {
    stopCamera();
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'] });
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = $('#camera-preview');
    video.hidden = false;
    video.srcObject = cameraStream;
    await video.play();
    $('#scan-message').textContent = 'Apuntá la cámara al código de barras.';
    scanTimer = setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length) lookupCode(codes[0].rawValue);
      } catch { /* Seguimos intentando en el próximo fotograma. */ }
    }, 450);
  } catch {
    stopCamera();
    $('#scan-message').textContent = 'No se pudo abrir la cámara. Revisá los permisos y usá HTTPS en el celular.';
  }
}

// EVENTOS PRINCIPALES

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  const scanButton = event.target.closest('[data-action="scan"]');
  const detailButton = event.target.closest('[data-detail]');
  const addButton = event.target.closest('[data-add]');
  const removeButton = event.target.closest('[data-remove]');
  if (viewButton) showView(viewButton.dataset.view);
  if (scanButton) {
    $('#scan-code').value = '';
    $('#scan-message').textContent = '';
    $('#scan-dialog').showModal();
  }
  if (detailButton) { selectedCode = detailButton.dataset.detail; showView('detail'); }
  if (addButton) addToOrder(addButton.dataset.add);
  if (removeButton) { delete order[removeButton.dataset.remove]; save(); updateCount(); renderOrder(); }
});

$('#home-search').addEventListener('input', (event) => {
  $('#catalog-search').value = event.target.value;
  showView('catalog');
});
$('#catalog-search').addEventListener('input', renderCatalog);

$('#order-list').addEventListener('change', (event) => {
  if (!event.target.matches('[data-quantity]')) return;
  const quantity = Number(event.target.value);
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    notify('La cantidad debe ser un número entero mayor a cero.');
    renderOrder();
    return;
  }
  order[event.target.dataset.quantity] = quantity;
  save();
  renderOrder();
});

$('#product-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const originalCode = $('#edit-original-code').value;
  const product = {
    code: $('#product-code').value.trim(),
    name: $('#product-name').value.trim(),
    wholesale: Number($('#product-wholesale').value),
    retail: Number($('#product-retail').value),
    stock: $('#product-stock').value === '' ? null : Number($('#product-stock').value)
  };
  if (!product.code || !product.name || !Number.isFinite(product.wholesale) || !Number.isFinite(product.retail) || product.wholesale < 0 || product.retail < 0 || (product.stock !== null && (!Number.isSafeInteger(product.stock) || product.stock < 0))) {
    notify('Revisá los datos del producto.');
    return;
  }
  if (products.some((item) => item.code === product.code && item.code !== originalCode)) {
    notify('Ya existe un producto con ese código.');
    return;
  }
  if (originalCode) {
    products = products.map((item) => item.code === originalCode ? product : item);
    if (originalCode !== product.code && order[originalCode]) {
      order[product.code] = (order[product.code] || 0) + order[originalCode];
      delete order[originalCode];
    }
  } else {
    products.push(product);
  }
  save();
  resetForm();
  updateCount();
  notify('Producto guardado.');
  showView('catalog');
});

$('#cancel-edit').addEventListener('click', resetForm);
$('#export-button').addEventListener('click', exportOrder);
$('#clear-order').addEventListener('click', () => {
  if (!confirm('¿Querés vaciar la lista de pedido?')) return;
  order = {};
  save();
  updateCount();
  renderOrder();
});
$('#close-scan').addEventListener('click', closeScanner);
$('#scan-dialog').addEventListener('close', stopCamera);
$('#lookup-code').addEventListener('click', () => lookupCode($('#scan-code').value));
$('#scan-code').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') lookupCode(event.target.value);
});
$('#start-camera').addEventListener('click', startCamera);

updateCount();
renderCatalog();
