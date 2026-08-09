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

const checkAnakTidakSekolah = document.getElementById("anak_tidak_sekolah");
const wrapJumlahAnak = document.getElementById("wrap-jumlah-anak");

const kategoriLainnyaCheck = document.getElementById("kategori_lainnya_check");
const wrapKategoriLainnya = document.getElementById("wrap-kategori-lainnya");

// Tampilkan/sembunyikan field jumlah anak sesuai checkbox
checkAnakTidakSekolah.addEventListener("change", () => {
  wrapJumlahAnak.hidden = !checkAnakTidakSekolah.checked;
});

// Tampilkan/sembunyikan input teks "kategori lainnya"
kategoriLainnyaCheck.addEventListener("change", () => {
  wrapKategoriLainnya.hidden = !kategoriLainnyaCheck.checked;
});

// ================= TAMPILKAN NAMA FILE DI UPLOAD PILL =================
const uploadFileIds = ["foto_kk", "foto_ktp", "foto_kondisi_rumah"];

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
    const fotoKTPFile = document.getElementById("foto_ktp").files[0];
    const fotoRumahFile = document.getElementById("foto_kondisi_rumah").files[0];

    // Upload semua file dulu ke Storage
    const [fotoKKPath, fotoKTPPath, fotoRumahPath] = await Promise.all([
      uploadFile(fotoKKFile, "kk"),
      uploadFile(fotoKTPFile, "ktp"),
      uploadFile(fotoRumahFile, "kondisi-rumah"),
    ]);

    // Kumpulkan kategori permasalahan yang dicentang
    const kategoriPermasalahan = Array.from(
      document.querySelectorAll('input[name="kategori_permasalahan"]:checked')
    ).map((el) => el.value);

    // Susun payload sesuai kolom tabel survey_rumah_tangga
    const payload = {
      nomor_kk: document.getElementById("nomor_kk").value.trim(),
      nik: document.getElementById("nik").value.trim(),
      nama_kepala_keluarga: document.getElementById("nama_kepala_keluarga").value.trim(),
      alamat: document.getElementById("alamat").value.trim(),
      rt: document.getElementById("rt").value.trim(),
      rw: document.getElementById("rw").value.trim(),
      dusun: document.getElementById("dusun").value.trim(),
      desa: document.getElementById("desa").value.trim(),
      no_telepon: document.getElementById("no_telepon").value.trim(),

      foto_kk_url: fotoKKPath,
      foto_ktp_url: fotoKTPPath,
      foto_kondisi_rumah_url: fotoRumahPath,

      kategori_permasalahan: kategoriPermasalahan,
      kategori_lainnya: kategoriLainnyaCheck.checked
        ? document.getElementById("kategori_lainnya").value.trim()
        : null,

      anak_tidak_sekolah: checkAnakTidakSekolah.checked,
      jumlah_anak_tidak_sekolah: checkAnakTidakSekolah.checked
        ? Number(document.getElementById("jumlah_anak_tidak_sekolah").value || 0)
        : 0,
      keterangan_anak_tidak_sekolah: document.getElementById("keterangan_anak_tidak_sekolah").value.trim(),

      rumah_belum_berplester: document.getElementById("rumah_belum_berplester").checked,
      belum_ada_listrik: document.getElementById("belum_ada_listrik").checked,

      status_desil: document.getElementById("status_desil").value,
      ada_anak_calon_mahasiswa: document.getElementById("ada_anak_calon_mahasiswa").checked,
    };

    const { error } = await supabaseClient.from(TABLE_NAME).insert([payload]);

    if (error) {
      throw new Error(error.message);
    }

    showMessage("Data berhasil dikirim. Terima kasih atas partisipasinya.", "success");
    form.reset();
    wrapJumlahAnak.hidden = true;
    wrapKategoriLainnya.hidden = true;
  } catch (err) {
    console.error(err);
    showMessage(`Gagal mengirim data: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Data";
  }
});