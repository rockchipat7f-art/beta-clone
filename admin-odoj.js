// 1. Inisialisasi Supabase
const supabaseUrl = 'https://udlnluanzqlxpvdpzzzh.supabase.co'; 
const supabaseKey = 'sb_publishable_wqhi-fyHbJEzsh0FYG7tvw_zJGdDPHr'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- KALKULASI TANGGAL SESI (Shift 12 Siang) ---
function dapatkanTanggalSesi(waktu = null) {
  const d = waktu ? new Date(waktu) : new Date();
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return d.toDateString();
}

// --- KALKULASI TANGGAL KEMARIN (FORMAT WA) ---
function getTanggalKemarin() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.getDay()];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getMonth()];
  return `${hari}, ${d.getDate()} ${bulan} ${d.getFullYear()}`;
}

// --- LOGIN ADMIN ---
function cekLoginAdmin() {
  const pass = document.getElementById('adminPass').value;
  if (pass === 'bismillah') {
    document.getElementById('loginAdminLayer').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    muatDataUser(); muatDataLaporan();
  } else alert('Password salah, silakan coba lagi!');
}
function logoutAdmin() {
  document.getElementById('adminPass').value = '';
  document.getElementById('loginAdminLayer').style.display = 'flex';
  document.getElementById('adminContent').style.display = 'none';
}
document.getElementById('adminPass').addEventListener("keypress", function(e) { if (e.key === "Enter") cekLoginAdmin(); });

// --- FUNGSI PINDAH TAB ---
function bukaTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if(event) event.currentTarget.classList.add('active');
}

// ==========================================
// BAGIAN 1: MANAJEMEN USER
// ==========================================
async function muatDataUser() {
  const listUser = document.getElementById('listUser');
  const selectUser = document.getElementById('adminSelectUser');
  const sortVal = document.getElementById('sortUser').value; 
  listUser.innerHTML = '<div class="loading-teks">Memuat data...</div>';

  let query = supabaseClient.from('table_user').select('*');
  if (sortVal === 'id_asc') query = query.order('id', { ascending: true });
  else if (sortVal === 'id_desc') query = query.order('id', { ascending: false });
  else if (sortVal === 'nama_asc') query = query.order('username', { ascending: true });
  else if (sortVal === 'nama_desc') query = query.order('username', { ascending: false });

  const { data, error } = await query;
  if (error) { listUser.innerHTML = `<div style="color:red;">Error: ${error.message}</div>`; return; }

  listUser.innerHTML = ''; selectUser.innerHTML = '<option value="">-- Pilih User --</option>'; 
  data.forEach(user => {
    const isAktif = user.status !== false && user.status !== null;
    const statusTeks = isAktif ? '<span class="badge bg-hijau">Aktif</span>' : '<span class="badge bg-merah">Nonaktif</span>';
    const btnTeks = isAktif ? 'Nonaktifkan' : 'Aktifkan';
    const btnClass = isAktif ? 'btn-toggle nonaktif' : 'btn-toggle';
    const passInfo = user.password ? 'Terisi (Tersembunyi)' : '<em>(Kosong)</em>';

    listUser.innerHTML += `
      <div class="item-card">
        <div class="item-header"><span>${user.username}</span> ${statusTeks}</div>
        <div class="item-sub">ID: ${user.id} | Pass: ${passInfo}</div>
        <div class="item-actions">
          <button class="${btnClass}" onclick="toggleStatusUser(${user.id}, ${!isAktif})">${btnTeks}</button>
          <button class="btn-edit" onclick="resetPasswordUser(${user.id}, '${user.username}')">Reset Pass</button>
        </div>
      </div>
    `;
    selectUser.innerHTML += `<option value="${user.username}">${user.username}</option>`;
  });
}

async function resetPasswordUser(id, uname) {
  if(!confirm(`Reset/Hapus password untuk ${uname}?`)) return;
  const { error } = await supabaseClient.from('table_user').update({ password: null }).eq('id', id);
  if (error) alert("Gagal reset: " + error.message); else { alert("Berhasil direset!"); muatDataUser(); }
}

document.getElementById('formAddUser').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uname = document.getElementById('newUsername').value.trim().toUpperCase();
  const pass = document.getElementById('newPassword').value.trim();
  const { data: cekUser } = await supabaseClient.from('table_user').select('username').eq('username', uname);
  if (cekUser && cekUser.length > 0) { alert(`Username '${uname}' sudah ada!`); return; }

  const { error } = await supabaseClient.from('table_user').insert([{ username: uname, password: pass || null, status: true }]);
  if (error) alert("Gagal tambah: " + error.message); else { alert("User berhasil ditambah!"); document.getElementById('formAddUser').reset(); muatDataUser(); }
});

async function toggleStatusUser(id, statusBaru) {
  if(!confirm(`Ubah status user?`)) return;
  const { error } = await supabaseClient.from('table_user').update({ status: statusBaru }).eq('id', id);
  if (error) alert("Gagal: " + error.message); else muatDataUser();
}

// ==========================================
// BAGIAN 2: MANAJEMEN LAPORAN
// ==========================================
async function muatDataLaporan() {
  const listLaporan = document.getElementById('listLaporan');
  listLaporan.innerHTML = '<div class="loading-teks">Memuat laporan...</div>';
  const { data, error } = await supabaseClient.from('table_data_report').select('*').order('created_at', { ascending: false }).limit(50); 
  if (error) { listLaporan.innerHTML = `<div style="color:red;">Error: ${error.message}</div>`; return; }

  listLaporan.innerHTML = '';
  data.forEach(rep => {
    const waktu = new Date(rep.created_at).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
    let detail = [];
    if(rep['D-K'] === 2) detail.push("<b>STATUS IZIN (Semua Kriteria=2)</b>");
    else if(rep['D-K'] === 3) detail.push("<b style='color:var(--merah);'>ALPA / TANPA KABAR ❌</b>");
    else {
      if(rep['T-K']!==null) detail.push(`Tilawah(${rep['T-K']})`); if(rep['T-TK']!==null) detail.push(`TilawahTdk(${rep['T-TK']})`);
      if(rep['T-M']!==null) detail.push(`Murottal(${rep['T-M']})`); if(rep['T-T']!==null) detail.push(`Terjemah(${rep['T-T']})`);
      if(rep['SD-D']!==null) detail.push(`Dhuha(${rep['SD-D']})`); if(rep['SD-H']!==null) detail.push(`DhuhaHaid(${rep['SD-H']})`);
      if(rep['ST-T']!==null) detail.push(`Tahajjud(${rep['ST-T']})`); if(rep['ST-H']!==null) detail.push(`TahajjudHaid(${rep['ST-H']})`);
      if(rep['SF-F']!==null) detail.push(`Fajar(${rep['SF-F']})`); if(rep['SF-H']!==null) detail.push(`FajarHaid(${rep['SF-H']})`);
      if(rep['D-K']!==null) detail.push(`Dzikir(${rep['D-K']})`); if(rep['D-PG']!==null) detail.push(`DzikirPagi(${rep['D-PG']})`); if(rep['D-PT']!==null) detail.push(`DzikirPetg(${rep['D-PT']})`);
    }
    listLaporan.innerHTML += `
      <div class="item-card">
        <div class="item-header"><span>${rep.user}</span> <span class="badge bg-hijau">Juz ${rep['T-J'] || '-'}</span></div>
        <div class="item-sub">🕒 ${waktu}</div>
        <div class="item-detail">${detail.length ? detail.join(', ') : 'Belum isi kriteria'}</div>
        <div class="item-actions">
          <button class="btn-edit" onclick='siapkanEditLaporan(${JSON.stringify(rep)})'>Edit</button>
          <button class="btn-hapus" onclick="hapusLaporan(${rep.id})">Hapus</button>
        </div>
      </div>
    `;
  });
}

async function hapusLaporan(id) {
  if(!confirm("Hapus data laporan permanen?")) return;
  const { error } = await supabaseClient.from('table_data_report').delete().eq('id', id);
  if (error) alert("Gagal: " + error.message); else muatDataLaporan();
}

function siapkanEditLaporan(rep) {
  bukaTab('tabLaporan');
  document.getElementById('judulFormLaporan').innerText = "Edit Laporan (ID: " + rep.id + ")";
  document.getElementById('btnAdminSubmitLaporan').innerText = "Update";
  document.getElementById('btnBatalEdit').style.display = "block";
  document.getElementById('editReportId').value = rep.id;
  document.getElementById('adminSelectUser').value = rep.user;
  document.getElementById('adminTJ').value = rep['T-J'] || '';

  if (rep['D-K'] === 2) {
    document.getElementById('adminTilawah').value = ''; document.getElementById('adminDhuha').value = '';
    document.getElementById('adminTahajjud').value = ''; document.getElementById('adminFajar').value = ''; document.getElementById('adminDzikir').value = 'IZIN';
  } else {
    if(rep['T-K']===100) document.getElementById('adminTilawah').value = 'T-K'; else if(rep['T-TK']===0) document.getElementById('adminTilawah').value = 'T-TK'; else if(rep['T-M']===100) document.getElementById('adminTilawah').value = 'T-M'; else if(rep['T-T']===100) document.getElementById('adminTilawah').value = 'T-T'; else document.getElementById('adminTilawah').value = '';
    if(rep['SD-D']===100) document.getElementById('adminDhuha').value = 'SD-D'; else if(rep['SD-TD']===0) document.getElementById('adminDhuha').value = 'SD-TD'; else if(rep['SD-H']===1) document.getElementById('adminDhuha').value = 'SD-H'; else document.getElementById('adminDhuha').value = '';
    if(rep['ST-T']===100) document.getElementById('adminTahajjud').value = 'ST-T'; else if(rep['ST-TT']===0) document.getElementById('adminTahajjud').value = 'ST-TT'; else if(rep['ST-H']===1) document.getElementById('adminTahajjud').value = 'ST-H'; else document.getElementById('adminTahajjud').value = '';
    if(rep['SF-F']===100) document.getElementById('adminFajar').value = 'SF-F'; else if(rep['SF-TF']===0) document.getElementById('adminFajar').value = 'SF-TF'; else if(rep['SF-H']===1) document.getElementById('adminFajar').value = 'SF-H'; else document.getElementById('adminFajar').value = '';
    if(rep['D-K']===100) document.getElementById('adminDzikir').value = 'D-K'; else if(rep['D-PG']===50) document.getElementById('adminDzikir').value = 'D-PG'; else if(rep['D-PT']===50) document.getElementById('adminDzikir').value = 'D-PT'; else if(rep['D-TK']===0) document.getElementById('adminDzikir').value = 'D-TK'; else document.getElementById('adminDzikir').value = '';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function batalEdit() {
  document.getElementById('formAdminReport').reset();
  document.getElementById('judulFormLaporan').innerText = "Tambah Laporan Baru"; document.getElementById('btnAdminSubmitLaporan').innerText = "Simpan Laporan";
  document.getElementById('btnBatalEdit').style.display = "none"; document.getElementById('editReportId').value = "";
}

document.getElementById('formAdminReport').addEventListener('submit', async (e) => {
  e.preventDefault();
  const idEdit = document.getElementById('editReportId').value; const userDipilih = document.getElementById('adminSelectUser').value;
  if(!userDipilih) { alert("Pilih user!"); return; }

  const valTJ = parseInt(document.getElementById('adminTJ').value) || null; const valTilawah = document.getElementById('adminTilawah').value;
  const valDhuha = document.getElementById('adminDhuha').value; const valTahajjud = document.getElementById('adminTahajjud').value;
  const valFajar = document.getElementById('adminFajar').value; const valDzikir = document.getElementById('adminDzikir').value;

  let payload = {};
  if (valDzikir === 'IZIN') {
    payload = { 'T-K': 2, 'T-TK': null, 'T-M': null, 'T-T': null, 'SD-D': 2, 'SD-TD': null, 'SD-H': null, 'ST-T': 2, 'ST-TT': null, 'ST-H': null, 'SF-F': 2, 'SF-TF': null, 'SF-H': null, 'D-K': 2, 'D-PG': null, 'D-PT': null, 'D-TK': null };
    if (valTJ !== null) payload['T-J'] = valTJ; if (!idEdit) payload.user = userDipilih;
  } else {
    if (!idEdit) payload.user = userDipilih; if (valTJ !== null) payload['T-J'] = valTJ;
    ['T-K', 'T-TK', 'T-M', 'T-T'].forEach(c => payload[c] = null); if (valTilawah === 'T-K') payload['T-K'] = 100; else if (valTilawah === 'T-TK') payload['T-TK'] = 0; else if (valTilawah === 'T-M') payload['T-M'] = 100; else if (valTilawah === 'T-T') payload['T-T'] = 100;
    ['SD-D', 'SD-TD', 'SD-H'].forEach(c => payload[c] = null); if (valDhuha === 'SD-D') payload['SD-D'] = 100; else if (valDhuha === 'SD-TD') payload['SD-TD'] = 0; else if (valDhuha === 'SD-H') payload['SD-H'] = 1;
    ['ST-T', 'ST-TT', 'ST-H'].forEach(c => payload[c] = null); if (valTahajjud === 'ST-T') payload['ST-T'] = 100; else if (valTahajjud === 'ST-TT') payload['ST-TT'] = 0; else if (valTahajjud === 'ST-H') payload['ST-H'] = 1;
    ['SF-F', 'SF-TF', 'SF-H'].forEach(c => payload[c] = null); if (valFajar === 'SF-F') payload['SF-F'] = 100; else if (valFajar === 'SF-TF') payload['SF-TF'] = 0; else if (valFajar === 'SF-H') payload['SF-H'] = 1;
    ['D-K', 'D-PG', 'D-PT', 'D-TK'].forEach(c => payload[c] = null); if (valDzikir === 'D-K') payload['D-K'] = 100; else if (valDzikir === 'D-PG') payload['D-PG'] = 50; else if (valDzikir === 'D-PT') payload['D-PT'] = 50; else if (valDzikir === 'D-TK') payload['D-TK'] = 0;
  }

  if (idEdit) { const { error } = await supabaseClient.from('table_data_report').update(payload).eq('id', idEdit); if (error) alert("Gagal update: " + error.message); else { alert("Sukses update!"); batalEdit(); muatDataLaporan(); } } 
  else { const { error } = await supabaseClient.from('table_data_report').insert([payload]); if (error) alert("Gagal simpan: " + error.message); else { alert("Sukses tambah!"); batalEdit(); muatDataLaporan(); } }
});

// --- FUNGSI TANDAI ALPA / TANPA KABAR ---
async function tandaiAlpa() {
  const userDipilih = document.getElementById('adminSelectUser').value;
  if(!userDipilih) { alert("Pilih user dulu wakk!"); return; }
  if(!confirm(`Yakin mau tandai ${userDipilih} ALPA (Tanpa Kabar) hari ini?`)) return;

  // Kode 3 = ALPA (Tidak Lapor)
  const payload = {
    user: userDipilih, 'T-J': null,
    'T-K': 3, 'T-TK': null, 'T-M': null, 'T-T': null,
    'SD-D': 3, 'SD-TD': null, 'SD-H': null,
    'ST-T': 3, 'ST-TT': null, 'ST-H': null,
    'SF-F': 3, 'SF-TF': null, 'SF-H': null,
    'D-K': 3, 'D-PG': null, 'D-PT': null, 'D-TK': null
  };

  document.getElementById('btnAdminAlpa').innerText = "Memproses...";
  const { error } = await supabaseClient.from('table_data_report').insert([payload]);
  
  if (error) alert("Gagal tandai Alpa: " + error.message);
  else { alert("Berhasil ditandai ALPA ❌"); batalEdit(); muatDataLaporan(); }
  document.getElementById('btnAdminAlpa').innerText = "Tandai Alpa ❌";
}

// ==========================================
// BAGIAN 3: REKAP HARIAN (FORMAT WA)
// ==========================================
let teksRekapGlobal = "";

// --- HITUNG ALPA UNTUK REKAP ADMIN ---
function getConsecutiveAlpaAdmin(username, semuaLaporan) {
  let reps = semuaLaporan.filter(r => r.user === username);
  let count = 0;
  for (let r of reps) {
    if (r['D-K'] === 3) count++;
    else break;
  }
  return count > 0 ? count : 1;
}

// --- IKON UNTUK FORMAT WA ---
function getIkonRekap(rep, semuaLaporan) {
  if (rep['D-K'] === 2) return 'ℹ️';
  
  // Jika ALPA, gabungkan X sesuai jumlah hari beruntun tanpa spasi (❌❌❌)
  if (rep['D-K'] === 3) return Array(getConsecutiveAlpaAdmin(rep.user, semuaLaporan)).fill('❌').join('');

  let ikon = [];
  if (rep['T-K'] === 100) ikon.push('✅'); else if (rep['T-M'] === 100) ikon.push('🎧'); else if (rep['T-T'] === 100) ikon.push('🔀'); else if (rep['T-TK'] === 0) ikon.push('💔'); else ikon.push('➖');
  if (rep['SD-D'] === 100) ikon.push('✅'); else if (rep['SD-TD'] === 0) ikon.push('💔'); else if (rep['SD-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['ST-T'] === 100) ikon.push('✅'); else if (rep['ST-TT'] === 0) ikon.push('💔'); else if (rep['ST-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['SF-F'] === 100) ikon.push('✅'); else if (rep['SF-TF'] === 0) ikon.push('💔'); else if (rep['SF-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['D-K'] === 100) ikon.push('✅'); else if (rep['D-PG'] === 50 || rep['D-PT'] === 50) ikon.push('💗'); else if (rep['D-TK'] === 0) ikon.push('💔'); else ikon.push('➖');
  return ikon.join('');
}

async function muatRekapHarian() {
  const tempatRekap = document.getElementById('tempatRekap');
  tempatRekap.innerHTML = '<div class="loading-teks">Menyusun rekap harian...</div>';
  
  const sesiHariIni = dapatkanTanggalSesi();
  const { data: semuaLaporan } = await supabaseClient.from('table_data_report').select('*').order('created_at', { ascending: false }).limit(500);
  const laporanSesiIni = semuaLaporan ? semuaLaporan.filter(r => dapatkanTanggalSesi(r.created_at) === sesiHariIni) : [];
  
  const tglKemarin = getTanggalKemarin();
  const headerTeksWA = `🌹 *LAPORAN TILAWAH ODOJ MUMTAZ CORP. + SHOLAT DHUHA + TAHAJJUD + FAJAR + DZIKIR PAGI PETANG 🌹👑*\n*${tglKemarin}*\n\nAdmin : .......\n\n`;
  
  teksRekapGlobal = headerTeksWA; 
  let htmlOutput = `<div style="color:var(--hijau); font-weight:bold; margin-bottom:15px;">🌹 LAPORAN TILAWAH ODOJ MUMTAZ...<br>${tglKemarin}<br><br><span style="color:var(--gelap);">Admin : .......</span></div>`;     

  let adaData = false;
  
  // 1. Loop untuk Juz 1-30 yang Lapor Normal / Izin
  for (let i = 1; i <= 30; i++) {
    let repJuzList = laporanSesiIni.filter(r => r['T-J'] === i && r['D-K'] !== 3); // Singkirkan yang ALPA dari list Juz
    if (repJuzList.length > 0) {
      adaData = true;
      let namaJuz = i.toString().padStart(2, '0');
      teksRekapGlobal += `*JUZ ${namaJuz}*\n`;
      htmlOutput += `<div class="rekap-juz-title">*JUZ ${namaJuz}*</div>`;
      repJuzList.forEach(rep => {
        let ikon = getIkonRekap(rep);
        teksRekapGlobal += `* ${rep.user} : ${ikon}\n`;
        htmlOutput += `<div class="rekap-user-row">* ${rep.user} : ${ikon}</div>`;
      });
      teksRekapGlobal += `\n`; htmlOutput += `<br>`;
    }
  }

  // 2. Loop Khusus untuk yang ALPA (Tanpa Juz)
  let repAlpaList = laporanSesiIni.filter(r => r['D-K'] === 3);
  if (repAlpaList.length > 0) {
    adaData = true;
    teksRekapGlobal += `*TANPA KETERANGAN / ALPA*\n`;
    htmlOutput += `<div class="rekap-juz-title" style="color:var(--merah);">*TANPA KETERANGAN / ALPA*</div>`;
    repAlpaList.forEach(rep => {
      let ikon = getIkonRekap(rep);
      teksRekapGlobal += `* ${rep.user} : ${ikon}\n`;
      htmlOutput += `<div class="rekap-user-row">* ${rep.user} : ${ikon}</div>`;
    });
    teksRekapGlobal += `\n`; htmlOutput += `<br>`;
  }

  if (!adaData) {
    htmlOutput += "<div style='color: var(--merah); text-align:center;'>Belum ada data laporan untuk sesi hari ini.</div>";
  }

  tempatRekap.innerHTML = htmlOutput;
}

function copyRekap() {
  if (!teksRekapGlobal) return;
  navigator.clipboard.writeText(teksRekapGlobal.trim()).then(() => {
    const btnCopy = document.getElementById('btnCopyRekap');
    const textAwal = btnCopy.innerText;
    btnCopy.innerText = "✅ TERSALIN!"; btnCopy.style.background = "var(--hijau)";
    setTimeout(() => { btnCopy.innerText = textAwal; btnCopy.style.background = "var(--biru)"; }, 2000);
  }).catch(err => { alert('Browser tidak mendukung auto-copy. Silakan blok teks manual.'); });
}
