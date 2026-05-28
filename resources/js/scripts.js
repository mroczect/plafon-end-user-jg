// Konfigurasi
const CSV_PATH = './resources/data/table.csv';

let masterData = [];        // array of objects
let headers = [];           // urutan kolom sesuai CSV (MODEL,2025,2024,...)
let filterValues = {};      // { kolom: stringFilter }

const loadingDiv = document.getElementById('loading');
const tableContainer = document.getElementById('table-container');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const infoCounter = document.getElementById('info-counter');
const resetBtn = document.getElementById('reset-filters');

// Format Rupiah tanpa desimal
function formatRupiah(value) {
  if (value === undefined || value === null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num) || num === 0) return '—';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

// Escape HTML untuk keamanan
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Membuat header tabel + baris input filter
function buildHeader() {
  let headerHtml = '<tr>';
  for (let col of headers) {
    headerHtml += `<th>${escapeHtml(col)}</th>`;
  }
  headerHtml += '</tr><tr class="filter-row">';
  for (let col of headers) {
    headerHtml += `<th><input type="text" class="filter-input" data-col="${col}" placeholder="Filter..."></th>`;
  }
  headerHtml += '</tr>';
  tableHeader.innerHTML = headerHtml;

  // Pasang event listener untuk setiap input filter
  document.querySelectorAll('.filter-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const col = e.target.dataset.col;
      filterValues[col] = e.target.value.toLowerCase();
      applyFilters();
    });
  });
}

// Menampilkan data ke tabel
function renderTable(data) {
  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding:2rem;">Tidak ada data yang cocok dengan filter</td></tr>`;
    infoCounter.innerText = `0 / ${masterData.length} data`;
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
        // kolom tahun: format Rupiah dan align kanan
        html += `<td class="text-right">${formatRupiah(rawValue)}</td>`;
      }
    }
    html += '</tr>';
  }
  tableBody.innerHTML = html;
  infoCounter.innerText = `${data.length} / ${masterData.length} data`;
}

// Filter data berdasarkan semua filterValues (AND)
function getFilteredData() {
  const activeCols = Object.keys(filterValues).filter(col => filterValues[col] && filterValues[col].trim() !== '');
  if (activeCols.length === 0) return masterData.slice();

  return masterData.filter(row => {
    for (let col of activeCols) {
      const searchTerm = filterValues[col];
      let cellValue = row[col];
      if (cellValue === undefined || cellValue === null) cellValue = '';
      const strValue = String(cellValue).toLowerCase();
      if (!strValue.includes(searchTerm)) return false;
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
  // Reset nilai input di DOM
  document.querySelectorAll('.filter-input').forEach(input => {
    input.value = '';
  });
  applyFilters();
}

// Load CSV menggunakan PapaParse
function loadCSV() {
  Papa.parse(CSV_PATH, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) {
        loadingDiv.innerHTML = 'Gagal memuat CSV: file kosong atau tidak ditemukan. Pastikan path ./resources/data/table.csv benar.';
        return;
      }

      // Ambil urutan kolom dari meta.fields (menjaga urutan asli CSV)
      headers = results.meta.fields;
      if (!headers || headers.length === 0) {
        loadingDiv.innerHTML = 'Error: CSV tidak memiliki header.';
        return;
      }

      masterData = results.data;
      // Inisialisasi filterValues kosong
      headers.forEach(h => { filterValues[h] = ''; });

      // Buat tabel
      buildHeader();
      renderTable(masterData);

      // Sembunyikan loading, tampilkan tabel
      loadingDiv.style.display = 'none';
      tableContainer.style.display = 'block';
    },
    error: (err) => {
      loadingDiv.innerHTML = `Error membaca CSV: ${err.message}. Periksa koneksi atau path file.`;
      console.error(err);
    }
  });
}

// Event listener reset
resetBtn.addEventListener('click', resetFilters);

// Mulai aplikasi
loadCSV();