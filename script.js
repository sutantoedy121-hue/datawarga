// ================= KONFIGURASI SUPABASE =================
// Ganti dua nilai di bawah dengan punya kamu sendiri.
// Ambil dari: Project Settings -> API di dashboard Supabase.
const SUPABASE_URL = "https://sxfmukficorlwfmenvfb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_i6u3otDxLgxgvCUs7PD4mg_aNgt70Ob";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = "bukti-survey";
const TABLE_NAME = "survey_rumah_tangga";

// ================= ELEMEN ================
const form = document.getElementById("survey-form");
const submitBtn = document.getElementById("submit-btn");
const formMessage = document.getElementById("form-message");

const statusDesilSelect = document.getElementById("status_desil");
const wrapAnakInginKuliah = document.getElementById("wrap-anak-ingin-kuliah");
const anakInginKuliahCheckbox = document.getElementById("anak_ingin_kuliah");

const wrapNamaAnak = document.getElementById("wrap-nama-anak");
const namaAnakTextarea = document.getElementById("nama_anak_tidak_sekolah");
const anakTidakSekolahRadios = document.querySelectorAll('input[name="anak_tidak_sekolah"]');

// ================= DESIL: TAMPILKAN CENTANG "ANAK INGIN KULIAH" HANYA UNTUK DESIL 1-5 =================
statusDesilSelect.addEventListener("change", () => {
  const isDesil1to5 = ["1", "2", "3", "4", "5"].includes(statusDesilSelect.value);
  wrapAnakInginKuliah.hidden = !isDesil1to5;
  if (!isDesil1to5) {
    anakInginKuliahCheckbox.checked = false;
  }
});

// ================= ANAK TIDAK SEKOLAH: TAMPILKAN KOLOM NAMA JIKA "YA" =================
anakTidakSekolahRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    wrapNamaAnak.hidden = radio.value !== "ya" || !radio.checked;
  });
});

// ================= TAMPILKAN NAMA FILE DI UPLOAD PILL =================
const uploadFileIds = ["foto_kk", "foto_rumah"];

uploadFileIds.forEach((id) => {
  const input = document.getElementById(id);
  const filenameLabel = document.getElementById(`${id}-filename`);

  input.addEventListener("change", () => {
    filenameLabel.textContent = input.files[0] ? input.files[0].name : "Pilih foto";
  });
});

// ================= HELPER: TAMPILKAN PESAN =================
function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
  formMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ================= HELPER: UPLOAD FILE KE STORAGE =================
async function uploadFile(file, folder) {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(`Gagal upload ${folder}: ${error.message}`);
  }

  // Simpan path saja (bukan public URL, karena bucket bersifat privat)
  return fileName;
}

// ================= HELPER: AMBIL NILAI RADIO YA/TIDAK =================
function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value === "ya" : false;
}

// ================= SUBMIT FORM =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.hidden = true;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  try {
    const fotoKKFile = document.getElementById("foto_kk").files[0];
    const fotoRumahFile = document.getElementById("foto_rumah").files[0];

    // Upload semua file dulu ke Storage
    const [fotoKKPath, fotoRumahPath] = await Promise.all([
      uploadFile(fotoKKFile, "kk"),
      uploadFile(fotoRumahFile, "rumah"),
    ]);

    const isDesil1to5 = ["1", "2", "3", "4", "5"].includes(statusDesilSelect.value);
    const isAnakTidakSekolah = getRadioValue("anak_tidak_sekolah");

    // Susun payload sesuai kolom tabel survey_rumah_tangga
    const payload = {
      nama_kepala_keluarga: document.getElementById("nama_kepala_keluarga").value.trim(),
      nomor_kk: document.getElementById("nomor_kk").value.trim(),
      nik: document.getElementById("nik").value.trim(),
      pekerjaan: document.getElementById("pekerjaan").value.trim(),

      alamat: document.getElementById("alamat").value.trim(),
      rt: document.getElementById("rt").value.trim(),
      rw: document.getElementById("rw").value.trim(),

      foto_kk_url: fotoKKPath,
      foto_rumah_url: fotoRumahPath,

      status_desil: statusDesilSelect.value,
      anak_ingin_kuliah: isDesil1to5 ? anakInginKuliahCheckbox.checked : false,

      rumah_lantai_tanah: getRadioValue("rumah_lantai_tanah"),
      belum_ada_listrik: getRadioValue("belum_ada_listrik"),

      anak_tidak_sekolah: isAnakTidakSekolah,
      nama_anak_tidak_sekolah: isAnakTidakSekolah
        ? namaAnakTextarea.value
            .split("\n")
            .map((n) => n.trim())
            .filter(Boolean)
        : [],
    };

    const { error } = await supabaseClient.from(TABLE_NAME).insert([payload]);

    if (error) {
      throw new Error(error.message);
    }

    showMessage("Data berhasil dikirim. Terima kasih atas partisipasinya.", "success");
    form.reset();
    wrapAnakInginKuliah.hidden = true;
    wrapNamaAnak.hidden = true;
  } catch (err) {
    console.error(err);
    showMessage(`Gagal mengirim data: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Data";
  }
});