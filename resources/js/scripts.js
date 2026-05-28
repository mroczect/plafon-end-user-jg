const csvUrl = "./resources/data/table.csv";
let allData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 25;
let yearHeaders = [];

function cleanText(text) {
  if (text === undefined || text === null) return "-";
  let str = String(text).trim();
  return str === "" ? "-" : str;
}

function parseHarga(value) {
  if (!value || value === "-") return null;
  let str = String(value).replace(/[Rp.]/g, "").replace(/,/g, ".").trim();
  let num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function formatRupiah(angka) {
  if (angka === null || isNaN(angka)) return "Rp -";
  return "Rp " + Math.round(angka).toLocaleString("id-ID");
}

// Mendapatkan harga terbaru dari sebuah row (cek dari tahun terbaru ke terlama)
function getLatestPrice(row) {
  for (let h of yearHeaders) {
    let val = parseHarga(row[h]);
    if (val !== null) return val;
  }
  return null;
}

function extractMerkFromModel(modelName) {
  if (!modelName || modelName === "-") return "Lainnya";
  let words = modelName.trim().split(/\s+/);
  // Skip common prefixes
  if (["ALL", "NEW"].includes(words[0].toUpperCase()) && words.length > 1) {
    return words[1].toUpperCase();
  }
  return words[0].toUpperCase();
}

function buildUniqueMerkList(data) {
  const merkSet = new Set();
  for (let row of data) {
    let model = row["MODEL"] || Object.values(row)[0] || "";
    let merk = extractMerkFromModel(cleanText(model));
    if (merk) merkSet.add(merk);
  }
  return Array.from(merkSet).sort();
}

function applyFiltersAndSort(selectedMerk, searchTerm, sortType) {
  let result = [...allData];

  if (selectedMerk !== "SEMUA") {
    result = result.filter((row) => {
      let model = row["MODEL"] || Object.values(row)[0] || "";
      let merk = extractMerkFromModel(cleanText(model));
      return merk === selectedMerk;
    });
  }

  if (searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase();
    result = result.filter((row) => {
      const modelName = (
        row["MODEL"] ||
        Object.values(row)[0] ||
        ""
      ).toLowerCase();
      return modelName.includes(term);
    });
  }

  if (sortType !== "none") {
    result.sort((a, b) => {
      let hargaA = getLatestPrice(a);
      let hargaB = getLatestPrice(b);
      if (hargaA === null) hargaA = sortType === "asc" ? Infinity : -Infinity;
      if (hargaB === null) hargaB = sortType === "asc" ? Infinity : -Infinity;
      return sortType === "asc" ? hargaA - hargaB : hargaB - hargaA;
    });
  }
  return result;
}

function updateStatistics(data) {
  const total = data.length;
  let prices = [];

  for (let row of data) {
    let priceVal = getLatestPrice(row);
    if (priceVal !== null) prices.push(priceVal);
  }

  const maxPrice = prices.length ? Math.max(...prices) : null;
  const minPrice = prices.length ? Math.min(...prices) : null;
  const avgPrice = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null;

  document.getElementById("statJumlah").innerText = total;
  document.getElementById("statMax").innerText = formatRupiah(maxPrice);
  document.getElementById("statMin").innerText = formatRupiah(minPrice);
  document.getElementById("statAvg").innerText = avgPrice
    ? formatRupiah(avgPrice)
    : "Rp -";
}

function renderTableWithPagination() {
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageData = filteredData.slice(startIdx, endIdx);

  const thead = document.getElementById("tableHeader");
  const tbody = document.getElementById("tableBody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="100%" class="text-center py-10 text-slate-400 flex flex-col items-center justify-center gap-2"><i data-lucide="inbox" class="w-10 h-10"></i> Tidak ada data yang sesuai filter.</td></tr>`;
    document.getElementById("paginationControls").classList.add("hidden");
    lucide.createIcons();
    return;
  }

  const headers = Object.keys(allData[0]);
  const trHead = document.createElement("tr");
  headers.forEach((h, idx) => {
    const th = document.createElement("th");
    // Clean year format " 2,025 " to "2025"
    let displayHeader = cleanText(h);
    if (idx > 0) displayHeader = displayHeader.replace(/,\s*/g, "");

    th.textContent = displayHeader;
    if (idx === 0) {
      th.className =
        "px-5 py-3.5 font-semibold sticky left-0 bg-slate-50 z-20 border-r border-slate-200 min-w-[220px]";
    } else {
      th.className = "px-4 py-3.5 font-semibold whitespace-nowrap text-right";
    }
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  pageData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "transition-colors";
    headers.forEach((h, idx) => {
      const td = document.createElement("td");
      let cellValue = cleanText(row[h]);
      if (cellValue === "") cellValue = "-";
      td.textContent = cellValue;
      if (idx === 0) {
        td.className =
          "px-5 py-3 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200";
      } else {
        td.className = "px-4 py-3 text-slate-600 text-right tabular-nums"; // tabular-nums untuk angka rapi
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  document.getElementById("paginationInfo").innerHTML =
    `Menampilkan ${startIdx + 1}-${Math.min(endIdx, filteredData.length)} dari ${filteredData.length} data`;
  document.getElementById("prevPageBtn").disabled = currentPage === 1;
  document.getElementById("nextPageBtn").disabled =
    currentPage === totalPages || totalPages === 0;

  let pageHtml = "";
  for (let i = 1; i <= totalPages; i++) {
    if (
      totalPages <= 7 ||
      i <= 2 ||
      i >= totalPages - 1 ||
      Math.abs(i - currentPage) <= 1
    ) {
      pageHtml += `<button data-page="${i}" class="px-3 py-1.5 border rounded-md text-sm font-medium ${i === currentPage ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 hover:bg-slate-50"}">${i}</button>`;
    } else if (i === 3 && currentPage > 3) {
      pageHtml += `<span class="px-2 text-slate-400">...</span>`;
    }
  }
  document.getElementById("pageNumbers").innerHTML = pageHtml;

  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      currentPage = parseInt(e.target.getAttribute("data-page"));
      renderTableWithPagination();
    });
  });

  document.getElementById("paginationControls").classList.remove("hidden");
  lucide.createIcons(); // Re-init icons for newly added DOM elements
}

function refreshDisplay() {
  const selectedMerk = document.getElementById("merkFilter").value;
  const searchTerm = document.getElementById("searchInput").value;
  const sortType = document.getElementById("sortHarga").value;

  filteredData = applyFiltersAndSort(selectedMerk, searchTerm, sortType);
  updateStatistics(filteredData);
  currentPage = 1;
  renderTableWithPagination();

  const infoDiv = document.getElementById("infoFilter");
  if (selectedMerk !== "SEMUA" || searchTerm !== "") {
    infoDiv.classList.remove("hidden");
    infoDiv.innerHTML = `<span class="flex items-center gap-1"><i data-lucide="info" class="w-3 h-3"></i> Filter aktif: ${selectedMerk !== "SEMUA" ? `Merk = ${selectedMerk}` : ""} ${searchTerm !== "" ? ` | Pencarian = "${searchTerm}"` : ""}</span>`;
  } else {
    infoDiv.classList.add("hidden");
  }
  lucide.createIcons();
}

function exportFilteredData() {
  if (filteredData.length === 0)
    return alert("Tidak ada data untuk di-export.");

  const headers = Object.keys(allData[0]);
  let csvContent = headers.join(",") + "\n";

  filteredData.forEach((row) => {
    let rowArray = headers.map((h) => {
      let val = cleanText(row[h]);
      return val === "-" ? "" : `"${val}"`;
    });
    csvContent += rowArray.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "data_motor_filtered.csv";
  link.click();
}

Papa.parse(csvUrl, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    allData = results.data;
    if (allData.length === 0) {
      document.getElementById("loadingState").innerHTML =
        `<p class="text-red-500">CSV kosong atau tidak valid.</p>`;
      return;
    }

    const headers = Object.keys(allData[0]);
    yearHeaders = headers.slice(1);

    const merkList = buildUniqueMerkList(allData);
    const merkSelect = document.getElementById("merkFilter");
    merkSelect.innerHTML = '<option value="SEMUA">Semua Merk</option>';
    merkList.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      merkSelect.appendChild(opt);
    });

    filteredData = [...allData];
    updateStatistics(filteredData);
    renderTableWithPagination();

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("tableContainer").classList.remove("hidden");

    document
      .getElementById("searchInput")
      .addEventListener("input", () => refreshDisplay());
    document
      .getElementById("merkFilter")
      .addEventListener("change", () => refreshDisplay());
    document
      .getElementById("sortHarga")
      .addEventListener("change", () => refreshDisplay());
    document.getElementById("limitPage").addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value);
      currentPage = 1;
      refreshDisplay();
    });
    document.getElementById("resetFilterBtn").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("merkFilter").value = "SEMUA";
      document.getElementById("sortHarga").value = "none";
      refreshDisplay();
    });
    document.getElementById("prevPageBtn").addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTableWithPagination();
      }
    });
    document.getElementById("nextPageBtn").addEventListener("click", () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTableWithPagination();
      }
    });
    document
      .getElementById("exportCsvBtn")
      .addEventListener("click", exportFilteredData);

    // Mobile filter toggle
    document.getElementById("toggleFilterBtn").addEventListener("click", () => {
      document.getElementById("filterPanel").classList.toggle("hidden");
    });

    lucide.createIcons();
  },
  error: function (err) {
    document.getElementById("loadingState").innerHTML =
      `<p class="text-red-500 flex items-center justify-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Gagal memuat CSV. Pastikan file ada di folder /resources/data/</p>`;
    lucide.createIcons();
    console.error(err);
  },
});
