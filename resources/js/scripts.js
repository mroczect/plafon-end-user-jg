// Konfigurasi
const CSV_PATH = './resources/data/table.csv';

let masterData = [];
let headers = [];
let filterValues = {};
let debounceTimer = null;

const loadingDiv = document.getElementById('loading');
const tableContainer = document.getElementById('table-container');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const infoCounter = document.getElementById('info-counter');
const resetBtn = document.getElementById('reset-filters');

// Format Rupiah cepat
function formatRupiah(value) {
  if (value === undefined || value === null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num) || num === 0) return '—';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Header + filter row dengan ikon di placeholder
function buildHeader() {
  let headerHtml = '<tr>';
  for (let col of headers) {
    headerHtml += `<th>${escapeHtml(col)}</th>`;
  }
  headerHtml += '</tr><tr class="filter-row">';
  for (let col of headers) {
    let placeholderText = col === 'MODEL' ? '🔍 Cari model...' : '🔎 Filter tahun...';
    headerHtml += `<th><input type="text" class="filter-input" data-col="${col}" placeholder="${placeholderText}"></th>`;
  }
  headerHtml += '<tr>';
  tableHeader.innerHTML = headerHtml;

  document.querySelectorAll('.filter-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const col = e.target.dataset.col;
      filterValues[col] = e.target.value.toLowerCase();
      // Debounce untuk performa
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        applyFilters();
      }, 250);
    });
  });
}

// Render tabel + animasi fade singkat (tanpa reflow berat)
function renderTable(data) {
  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding:2rem;">✨ Tidak ada data yang cocok ✨</td></tr>`;
    infoCounter.innerHTML = `📊 0 / ${masterData.length} data`;
    return;
  }

  let html = '';
  for (let row of data) {
    html += '<tr>';
    for (let col of headers) {
      let rawValue = row[col];
      if (col === 'MODEL') {
        html += `<td><strong>${escapeHtml(rawValue) || '-'}</strong></td>`;
      } else {
        html += `<td class="text-right">${formatRupiah(rawValue)}</td>`;
      }
    }
    html += '</tr>';
  }
  // Animasi halus via opasitas (tambahkan class fade)
  tableBody.style.opacity = '0.6';
  tableBody.innerHTML = html;
  requestAnimationFrame(() => {
    tableBody.style.transition = 'opacity 0.12s';
    tableBody.style.opacity = '1';
  });
  infoCounter.innerHTML = `✨ ${data.length} / ${masterData.length} data ✨`;
}

// Filter AND cepat
function getFilteredData() {
  const activeCols = Object.keys(filterValues).filter(col => filterValues[col] && filterValues[col].trim() !== '');
  if (activeCols.length === 0) return masterData.slice();

  return masterData.filter(row => {
    for (let col of activeCols) {
      const searchTerm = filterValues[col];
      let cellValue = row[col];
      if (cellValue === undefined || cellValue === null) cellValue = '';
      if (!String(cellValue).toLowerCase().includes(searchTerm)) return false;
    }
    return true;
  });
}

function applyFilters() {
  const filtered = getFilteredData();
  renderTable(filtered);
}

function resetFilters() {
  filterValues = {};
  for (let col of headers) {
    filterValues[col] = '';
  }
  document.querySelectorAll('.filter-input').forEach(input => {
    input.value = '';
  });
  applyFilters();
  // Efek mini: sentuhan pada tombol reset via class flash (optional)
  resetBtn.style.transform = 'scale(0.97)';
  setTimeout(() => { resetBtn.style.transform = ''; }, 150);
}

// Load CSV
function loadCSV() {
  Papa.parse(CSV_PATH, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) {
        loadingDiv.innerHTML = '❌ CSV tidak ditemukan atau kosong. Periksa path: ./resources/data/table.csv';
        return;
      }
      headers = results.meta.fields;
      if (!headers || headers.length === 0) {
        loadingDiv.innerHTML = '❌ Header CSV rusak.';
        return;
      }
      masterData = results.data;
      headers.forEach(h => { filterValues[h] = ''; });

      buildHeader();
      renderTable(masterData);
      loadingDiv.style.display = 'none';
      tableContainer.style.display = 'block';
    },
    error: (err) => {
      loadingDiv.innerHTML = `⚠️ Gagal muat CSV: ${err.message}. Cek koneksi / path file.`;
      console.error(err);
    }
  });
}

resetBtn.addEventListener('click', resetFilters);

// Mulai
loadCSV();