// ================= KONFIGURASI SUPABASE =================
// Samakan dengan yang dipakai di script.js (form publik).
const SUPABASE_URL = "https://sxfmukficorlwfmenvfb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_i6u3otDxLgxgvCUs7PD4mg_aNgt70Ob";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = "bukti-survey";
const TABLE_NAME = "survey_rumah_tangga";

// ================= ELEMEN ================
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const logoutBtn = document.getElementById("logout-btn");

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");

const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterDesil = document.getElementById("filter-desil");
const filterResetBtn = document.getElementById("filter-reset-btn");
const exportBtn = document.getElementById("export-btn");

const tableBody = document.getElementById("data-table-body");
const tableEmpty = document.getElementById("table-empty");

const modal = document.getElementById("detail-modal");
const modalContent = document.getElementById("modal-content");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnVerifikasi = document.getElementById("btn-verifikasi");
const btnTolak = document.getElementById("btn-tolak");
const btnHapus = document.getElementById("btn-hapus");

let currentRows = [];
let filteredRows = [];
let activeRowId = null;

// ================= LABEL DESIL =================
function labelDesil(value) {
  if (!value || value === "tidak_terdaftar") return "Tidak Terdaftar";
  return `Desil ${value}`;
}

// ================= CEK SESI SAAT HALAMAN DIBUKA =================
async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;
  loadData();
}

// ================= LOGIN =================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Memproses...";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Masuk";

  if (error) {
    loginMessage.textContent = "Email atau password salah.";
    loginMessage.className = "form-message error";
    loginMessage.hidden = false;
    return;
  }

  showDashboard();
});

// ================= LOGOUT =================
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

// ================= MUAT DATA =================
async function loadData() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    tableBody.innerHTML = "";
    tableEmpty.hidden = false;
    tableEmpty.textContent = `Gagal memuat data: ${error.message}`;
    return;
  }

  currentRows = data || [];
  renderStats(currentRows);
  applyFiltersAndRender();
}

// ================= RINGKASAN STATISTIK =================
function renderStats(rows) {
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-menunggu").textContent = rows.filter(
    (r) => r.status_verifikasi === "menunggu"
  ).length;
  document.getElementById("stat-anak-tidak-sekolah").textContent = rows.filter(
    (r) => r.anak_tidak_sekolah
  ).length;
  document.getElementById("stat-anak-ingin-kuliah").textContent = rows.filter(
    (r) => r.anak_ingin_kuliah
  ).length;
  document.getElementById("stat-lantai-tanah").textContent = rows.filter(
    (r) => r.rumah_lantai_tanah
  ).length;
  document.getElementById("stat-listrik").textContent = rows.filter(
    (r) => r.belum_ada_listrik
  ).length;
}

// ================= FILTER =================
function applyFiltersAndRender() {
  const search = filterSearch.value.trim().toLowerCase();
  const status = filterStatus.value;
  const desil = filterDesil.value;

  const filtered = currentRows.filter((row) => {
    const matchSearch =
      !search ||
      (row.nama_kepala_keluarga || "").toLowerCase().includes(search) ||
      (row.nik || "").toLowerCase().includes(search) ||
      (row.nomor_kk || "").toLowerCase().includes(search) ||
      (row.pekerjaan || "").toLowerCase().includes(search);

    const matchStatus = !status || row.status_verifikasi === status;

    const matchDesil = !desil || row.status_desil === desil;

    return matchSearch && matchStatus && matchDesil;
  });

  filteredRows = filtered;
  renderTable(filtered);
}

[filterSearch, filterStatus, filterDesil].forEach((el) => {
  el.addEventListener("input", applyFiltersAndRender);
  el.addEventListener("change", applyFiltersAndRender);
});

filterResetBtn.addEventListener("click", () => {
  filterSearch.value = "";
  filterStatus.value = "";
  filterDesil.value = "";
  applyFiltersAndRender();
});

// ================= RENDER TABEL =================
function statusBadge(status) {
  const labelMap = {
    menunggu: "Menunggu",
    terverifikasi: "Terverifikasi",
    ditolak: "Ditolak",
  };
  return `<span class="badge badge-${status}">${labelMap[status] || status}</span>`;
}

function renderTable(rows) {
  tableBody.innerHTML = "";

  if (rows.length === 0) {
    tableEmpty.hidden = false;
    tableEmpty.textContent = "Belum ada data yang cocok dengan filter ini.";
    return;
  }

  tableEmpty.hidden = true;

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const tanggal = row.created_at
      ? new Date(row.created_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

    tr.innerHTML = `
      <td>${row.nama_kepala_keluarga || "-"}</td>
      <td>${row.nomor_kk || "-"}</td>
      <td>${row.nik || "-"}</td>
      <td>${row.pekerjaan || "-"}</td>
      <td>${row.rt || "-"}/${row.rw || "-"}</td>
      <td>${labelDesil(row.status_desil)}</td>
      <td>${statusBadge(row.status_verifikasi)}</td>
      <td>${tanggal}</td>
      <td class="row-actions">
        <button class="btn-link" data-id="${row.id}">Detail</button>
        <button class="btn-link-danger" data-id="${row.id}">Hapus</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll(".btn-link").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.id));
  });

  tableBody.querySelectorAll(".btn-link-danger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = currentRows.find((r) => r.id === btn.dataset.id);
      const nama = row ? row.nama_kepala_keluarga || "data ini" : "data ini";
      if (confirm(`Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
        deleteRow(btn.dataset.id);
      }
    });
  });
}

// ================= UNDUH FOTO =================
async function downloadSignedFile(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error(err);
    alert("Gagal mengunduh foto. Coba lagi.");
  }
}

// ================= MODAL DETAIL =================
async function getSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 10); // berlaku 10 menit

  if (error) {
    console.error(error);
    return null;
  }
  return data.signedUrl;
}

async function openDetail(id) {
  const row = currentRows.find((r) => r.id === id);
  if (!row) return;

  activeRowId = id;

  const [urlKK, urlRumah] = await Promise.all([
    getSignedUrl(row.foto_kk_url),
    getSignedUrl(row.foto_rumah_url),
  ]);

  const isDesil1to5 = ["1", "2", "3", "4", "5"].includes(row.status_desil);

  const namaAnakList =
    Array.isArray(row.nama_anak_tidak_sekolah) && row.nama_anak_tidak_sekolah.length
      ? row.nama_anak_tidak_sekolah.join(", ")
      : "-";

  modalContent.innerHTML = `
    <dl>
      <dt>Nama Kepala Keluarga</dt><dd>${row.nama_kepala_keluarga || "-"}</dd>
      <dt>Nomor KK</dt><dd>${row.nomor_kk || "-"}</dd>
      <dt>NIK</dt><dd>${row.nik || "-"}</dd>
      <dt>Pekerjaan</dt><dd>${row.pekerjaan || "-"}</dd>
      <dt>Alamat</dt><dd>${row.alamat || "-"}, RT ${row.rt || "-"}/RW ${row.rw || "-"}</dd>
      <dt>Status Desil</dt><dd>${labelDesil(row.status_desil)}</dd>
      ${isDesil1to5 ? `<dt>Ada Anak Ingin Kuliah</dt><dd>${row.anak_ingin_kuliah ? "Ya" : "Tidak"}</dd>` : ""}
      <dt>Rumah Lantai Tanah</dt><dd>${row.rumah_lantai_tanah ? "Ya" : "Tidak"}</dd>
      <dt>Rumah Belum Memiliki Listrik</dt><dd>${row.belum_ada_listrik ? "Ya" : "Tidak"}</dd>
      <dt>Ada Anak Tidak Sekolah</dt><dd>${row.anak_tidak_sekolah ? `Ya &mdash; ${namaAnakList}` : "Tidak"}</dd>
    </dl>
    <div class="modal-photos">
      ${urlKK ? `<button type="button" class="btn-download" data-url="${urlKK}" data-filename="foto-kk-${row.nomor_kk || "data"}.jpg">Unduh Foto KK</button>` : ""}
      ${urlRumah ? `<button type="button" class="btn-download" data-url="${urlRumah}" data-filename="foto-rumah-${row.nomor_kk || "data"}.jpg">Unduh Foto Rumah</button>` : ""}
    </div>
  `;

  modal.hidden = false;

  modalContent.querySelectorAll(".btn-download").forEach((btn) => {
    btn.addEventListener("click", () => {
      downloadSignedFile(btn.dataset.url, btn.dataset.filename);
    });
  });
}

modalCloseBtn.addEventListener("click", () => {
  modal.hidden = true;
  activeRowId = null;
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.hidden = true;
    activeRowId = null;
  }
});

// ================= VERIFIKASI / TOLAK =================
async function updateStatus(newStatus) {
  if (!activeRowId) return;

  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .update({ status_verifikasi: newStatus })
    .eq("id", activeRowId);

  if (error) {
    alert(`Gagal mengubah status: ${error.message}`);
    return;
  }

  modal.hidden = true;
  activeRowId = null;
  await loadData();
}

btnVerifikasi.addEventListener("click", () => updateStatus("terverifikasi"));
btnTolak.addEventListener("click", () => updateStatus("ditolak"));

// ================= HAPUS DATA =================
async function deleteRow(id) {
  const row = currentRows.find((r) => r.id === id);

  // Hapus foto terkait di storage (jika ada) supaya tidak jadi sampah bucket.
  const paths = [row?.foto_kk_url, row?.foto_rumah_url].filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove(paths);
    if (storageError) {
      // Jangan hentikan proses hanya karena file storage gagal dihapus.
      console.warn("Gagal menghapus sebagian foto:", storageError);
    }
  }

  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    alert(`Gagal menghapus data: ${error.message}`);
    return;
  }

  if (activeRowId === id) {
    modal.hidden = true;
    activeRowId = null;
  }

  await loadData();
}

btnHapus.addEventListener("click", () => {
  if (!activeRowId) return;
  const row = currentRows.find((r) => r.id === activeRowId);
  const nama = row ? row.nama_kepala_keluarga || "data ini" : "data ini";
  if (confirm(`Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
    deleteRow(activeRowId);
  }
});

// ================= EKSPOR EXCEL (RAPI & SIAP PRINT) =================
const labelStatus = {
  menunggu: "Menunggu",
  terverifikasi: "Terverifikasi",
  ditolak: "Ditolak",
};

exportBtn.addEventListener("click", async () => {
  const rows = filteredRows.length ? filteredRows : currentRows;

  if (rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  exportBtn.disabled = true;
  exportBtn.textContent = "Menyiapkan file...";

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Data Rumah Warga - Program Kerja KKN";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Data Rumah Warga", {
      views: [{ state: "frozen", ySplit: 3 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
    });

    const columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Kepala Keluarga", key: "nama", width: 24 },
      { header: "Nomor KK", key: "kk", width: 18 },
      { header: "NIK", key: "nik", width: 18 },
      { header: "Pekerjaan", key: "pekerjaan", width: 18 },
      { header: "Alamat", key: "alamat", width: 22 },
      { header: "RT", key: "rt", width: 6 },
      { header: "RW", key: "rw", width: 6 },
      { header: "Status Desil", key: "desil", width: 14 },
      { header: "Anak Ingin Kuliah", key: "ingin_kuliah", width: 16 },
      { header: "Rumah Lantai Tanah", key: "lantai", width: 16 },
      { header: "Belum Ada Listrik", key: "listrik", width: 16 },
      { header: "Anak Tidak Sekolah", key: "tidak_sekolah", width: 16 },
      { header: "Nama Anak Tidak Sekolah", key: "nama_anak", width: 26 },
      { header: "Status Verifikasi", key: "status", width: 16 },
      { header: "Tanggal Masuk", key: "tanggal", width: 15 },
    ];

    // ---- Judul di baris 1 (merged) ----
    sheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = "DATA RUMAH WARGA — PROGRAM KERJA KKN KECAMATAN KEDEWAN";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1E293B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 26;

    // ---- Subjudul tanggal ekspor di baris 2 (merged) ----
    sheet.mergeCells(2, 1, 2, columns.length);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = `Diekspor pada ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} — Total data: ${rows.length}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
    subtitleCell.alignment = { horizontal: "center" };
    sheet.getRow(2).height = 18;

    // ---- Header tabel di baris 3 ----
    sheet.columns = columns;
    const headerRow = sheet.getRow(3);
    headerRow.values = columns.map((c) => c.header);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1D4ED8" } },
        bottom: { style: "thin", color: { argb: "FF1D4ED8" } },
        left: { style: "thin", color: { argb: "FF1D4ED8" } },
        right: { style: "thin", color: { argb: "FF1D4ED8" } },
      };
    });

    // ---- Isi data mulai baris 4 ----
    rows.forEach((row, index) => {
      const tanggal = row.created_at
        ? new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "2-digit", month: "2-digit", year: "numeric",
          })
        : "-";

      const isDesil1to5 = ["1", "2", "3", "4", "5"].includes(row.status_desil);

      const dataRow = sheet.addRow({
        no: index + 1,
        nama: row.nama_kepala_keluarga || "-",
        kk: row.nomor_kk || "-",
        nik: row.nik || "-",
        pekerjaan: row.pekerjaan || "-",
        alamat: row.alamat || "-",
        rt: row.rt || "-",
        rw: row.rw || "-",
        desil: labelDesil(row.status_desil),
        ingin_kuliah: isDesil1to5 ? (row.anak_ingin_kuliah ? "Ya" : "Tidak") : "-",
        lantai: row.rumah_lantai_tanah ? "Ya" : "Tidak",
        listrik: row.belum_ada_listrik ? "Ya" : "Tidak",
        tidak_sekolah: row.anak_tidak_sekolah ? "Ya" : "Tidak",
        nama_anak:
          Array.isArray(row.nama_anak_tidak_sekolah) && row.nama_anak_tidak_sekolah.length
            ? row.nama_anak_tidak_sekolah.join(", ")
            : "-",
        status: labelStatus[row.status_verifikasi] || row.status_verifikasi || "-",
        tanggal,
      });

      const isEvenRow = index % 2 === 0;
      dataRow.eachCell((cell) => {
        cell.font = { size: 10.5 };
        cell.alignment = { vertical: "middle", wrapText: false };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (isEvenRow) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
    });

    // ---- Autofilter di baris header ----
    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: columns.length },
    };

    // ---- Simpan & unduh ----
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `data-rumah-warga-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(`Gagal membuat file Excel: ${err.message}`);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = "Ekspor Excel";
  }
});

// ================= MULAI =================
init();