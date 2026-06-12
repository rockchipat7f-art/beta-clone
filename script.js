// 1. Inisialisasi Supabase
const supabaseUrl = 'https://udlnluanzqlxpvdpzzzh.supabase.co'; 
const supabaseKey = 'sb_publishable_wqhi-fyHbJEzsh0FYG7tvw_zJGdDPHr'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variabel Global
let currentUser = '';
let currentReportId = null; 
let isSesiTerbuka = false;
let globalReports = []; 
let globalUsers = [];

// --- FUNGSI HASHING SHA-256 ---
async function hashPassword(string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- FUNGSI: KALKULASI TANGGAL SESI (Shift 12.00 Siang ke 12.00 Siang) ---
function dapatkanTanggalSesi(waktu = null) {
  const d = waktu ? new Date(waktu) : new Date();
  if (d.getHours() < 12) {
    d.setDate(d.getDate() - 1);
  }
  return d.toDateString();
}

// FUNGSI MENDAPATKAN ARRAY 7 HARI KEBELAKANG
function get7HariSesi() {
  let arr = [];
  for(let i=6; i>=0; i--) {
    let d = new Date();
    if (d.getHours() < 12) d.setDate(d.getDate() - 1);
    d.setDate(d.getDate() - i);
    arr.push(d.toDateString());
  }
  return arr;
}

// --- FUNGSI MENGHITUNG ALPA BERUNTUN ---
function hitungAlpaBeruntun(username) {
  if (!globalReports) return 1;
  // Ambil semua riwayat user dari yang terbaru ke terlama
  let userReps = globalReports.filter(r => r.user === username);
  let count = 0;
  for (let r of userReps) {
    if (r['D-K'] === 3) count++; // Kalau ketemu Alpa, tambah jumlah ❌
    else break; // Kalau ketemu laporan normal/izin, perhitungan berhenti
  }
  return count > 0 ? count : 1;
}

// --- FUNGSI MENGAMBIL IKON AMALIYAH ---
function getIkonAmaliyah(rep) {
  if (!rep) return '➖ ➖ ➖ ➖ ➖';
  if (rep['D-K'] === 2) return '🤍 🤍 🤍 🤍 🤍';
  if (rep['D-K'] === 3) {
    let count = hitungAlpaBeruntun(rep.user);
    // Menggandakan ikon ❌ sebanyak hari Alpa beruntun (pakai spasi agar rapi)
    return Array(count).fill('❌').join(' ');
  }
  
  let ikon = [];
  if (rep['T-K'] === 100) ikon.push('✅'); else if (rep['T-M'] === 100) ikon.push('🎧'); else if (rep['T-T'] === 100) ikon.push('🔀'); else if (rep['T-TK'] === 0) ikon.push('💔'); else ikon.push('➖');
  if (rep['SD-D'] === 100) ikon.push('✅'); else if (rep['SD-TD'] === 0) ikon.push('💔'); else if (rep['SD-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['ST-T'] === 100) ikon.push('✅'); else if (rep['ST-TT'] === 0) ikon.push('💔'); else if (rep['ST-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['SF-F'] === 100) ikon.push('✅'); else if (rep['SF-TF'] === 0) ikon.push('💔'); else if (rep['SF-H'] === 1) ikon.push('🚺'); else ikon.push('➖');
  if (rep['D-K'] === 100) ikon.push('✅'); else if (rep['D-PG'] === 50 || rep['D-PT'] === 50) ikon.push('💗'); else if (rep['D-TK'] === 0) ikon.push('💔'); else ikon.push('➖');
  return ikon.join(' ');
}

// --- FUNGSI MENGHITUNG SKOR UNTUK TINGGI GRAFIK BAR ---
function hitungSkorGrafik(rep) {
  if (!rep) return 0;
  if (rep['D-K'] === 2) return 500; // Izin full bar
  let score = 0;
  if (rep['T-K'] === 100 || rep['T-M'] === 100 || rep['T-T'] === 100) score += 100;
  if (rep['SD-D'] === 100 || rep['SD-H'] === 1) score += 100; 
  if (rep['ST-T'] === 100 || rep['ST-H'] === 1) score += 100;
  if (rep['SF-F'] === 100 || rep['SF-H'] === 1) score += 100;
  if (rep['D-K'] === 100) score += 100;
  else if (rep['D-PG'] === 50 || rep['D-PT'] === 50) score += 50;
  return score;
}

// --- FUNGSI CEK LENGKAP UNTUK BIDADARI SURGA ---
function isLengkap(rep) {
  if (!rep) return false;
  if (rep['D-K'] === 2) return true; 
  let t = (rep['T-K'] !== null || rep['T-TK'] !== null || rep['T-M'] !== null || rep['T-T'] !== null);
  let d = (rep['SD-D'] !== null || rep['SD-TD'] !== null || rep['SD-H'] !== null);
  let st = (rep['ST-T'] !== null || rep['ST-TT'] !== null || rep['ST-H'] !== null);
  let sf = (rep['SF-F'] !== null || rep['SF-TF'] !== null || rep['SF-H'] !== null);
  let dz = (rep['D-K'] !== null || rep['D-PG'] !== null || rep['D-PT'] !== null || rep['D-TK'] !== null);
  return t && d && st && sf && dz; 
}

document.addEventListener("DOMContentLoaded", function() {
  
  const btnBuka = document.getElementById('btnBuka');
  const btnTutup = document.getElementById('btnTutup');
  const loginLayer = document.getElementById('loginLayer');
  const gerbangUtama = document.getElementById('gerbangUtama');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
  const pesanError = document.getElementById('pesanError');
  const formReport = document.getElementById('formReport');
  const btnKirimReport = document.getElementById('btnKirimReport');
  const timerReport = document.getElementById('timerReport');

  inputPassword.addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); btnBuka.click(); }
  });

  // --- FUNGSI PINDAH HALAMAN (NAVIGASI) ---
  window.bukaHalaman = function(pageId, elemenTombol) {
    document.querySelectorAll('.navbar a').forEach(a => a.classList.remove('active'));
    elemenTombol.classList.add('active');
    document.querySelectorAll('.page-container').forEach(page => page.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    if (pageId === 'statistik') { muatDataStatistik(); }
    if (pageId === 'profil') { document.getElementById('profilUsername').innerText = currentUser; }
  };

  // --- FUNGSI UPDATE PASSWORD ---
  const formGantiPassword = document.getElementById('formGantiPassword');
  if (formGantiPassword) {
    formGantiPassword.addEventListener('submit', async function(e) {
      e.preventDefault();
      const passLama = document.getElementById('passLama').value.trim();
      const passBaru = document.getElementById('passBaru').value.trim();
      const btn = e.target.querySelector('button');

      btn.innerText = "Memproses...";
      const { data, error } = await supabaseClient.from('table_user').select('password').eq('username', currentUser).single();
      if(error) { alert("Sistem sibuk, gagal mengecek akun!"); btn.innerText = "Update Sandi"; return; }

      const hashedLama = await hashPassword(passLama);
      let match = (!data.password || data.password === '') ? (passLama === '') : (data.password === hashedLama);

      if (!match) {
        alert("Gagal: Password lama yang Anda masukkan salah!"); btn.innerText = "Update Sandi"; return;
      }

      const hashedBaru = await hashPassword(passBaru);
      const { error: errUpdate } = await supabaseClient.from('table_user').update({password: hashedBaru}).eq('username', currentUser);

      if(errUpdate) {
        alert("Gagal update sandi: " + errUpdate.message);
      } else {
        alert("Alhamdulillah! Kata sandi berhasil diganti.");
        formGantiPassword.reset();
      }
      btn.innerText = "Update Sandi";
    });
  }

  // --- FUNGSI STATISTIK HARIAN & RENDER MESIN JACKPOT ---
  async function muatDataStatistik() {
    const sesiHariIni = dapatkanTanggalSesi();
    document.getElementById('tglStatistik').innerText = `Data Sesi: ${sesiHariIni}`;

    // Kita limit 1500 agar mencakup 7 hari data semua jamaah
    const { data: semuaLaporan } = await supabaseClient.from('table_data_report').select('*').order('created_at', { ascending: false }).limit(1500);
    const { data: userAktif } = await supabaseClient.from('table_user').select('username').eq('status', true).order('username', { ascending: true });
    
    globalReports = semuaLaporan || [];
    globalUsers = userAktif || [];

    // --- KALKULASI RINGKASAN HARI INI ---
    const laporanSesiIni = globalReports.filter(r => dapatkanTanggalSesi(r.created_at) === sesiHariIni);
    const totalUser = globalUsers.length;
    let selesai = 0, izin = 0, belum = 0;
    let tCount = 0, dCount = 0, stCount = 0, sfCount = 0, dzCount = 0;

    globalUsers.forEach(u => {
      const rep = laporanSesiIni.find(r => r.user === u.username);
      if (!rep) {
        belum++;
      } else if (rep['D-K'] === 2) {
        izin++;
        tCount++; dCount++; stCount++; sfCount++; dzCount++; 
      } else {
        if (isLengkap(rep)) selesai++; else belum++;
        if (rep['T-K'] !== null || rep['T-TK'] !== null || rep['T-M'] !== null || rep['T-T'] !== null) tCount++;
        if (rep['SD-D'] !== null || rep['SD-TD'] !== null || rep['SD-H'] !== null) dCount++;
        if (rep['ST-T'] !== null || rep['ST-TT'] !== null || rep['ST-H'] !== null) stCount++;
        if (rep['SF-F'] !== null || rep['SF-TF'] !== null || rep['SF-H'] !== null) sfCount++;
        if (rep['D-K'] !== null || rep['D-PG'] !== null || rep['D-PT'] !== null || rep['D-TK'] !== null) dzCount++;
      }
    });

    document.getElementById('stat-total').innerText = totalUser;
    document.getElementById('stat-selesai').innerText = selesai;
    document.getElementById('stat-izin').innerText = izin;
    document.getElementById('stat-belum').innerText = belum;

    const setProgress = (id, count) => {
      const pct = totalUser === 0 ? 0 : Math.round((count / totalUser) * 100); 
      const el = document.getElementById(id);
      if (el) {
        el.style.width = pct + '%';
        el.parentElement.previousElementSibling.querySelector('.pct').innerText = pct + '%';
        if (pct === 100) el.style.background = '#2ecc71'; else el.style.background = '#10b981';
      }
    };

    setProgress('prog-tilawah', tCount);
    setProgress('prog-dhuha', dCount);
    setProgress('prog-tahajjud', stCount);
    setProgress('prog-fajar', sfCount);
    setProgress('prog-dzikir', dzCount);

    // INISIALISASI MESIN JACKPOT & GRAFIK
    initJackpot(globalUsers, currentUser);
  }

  // --- ENGINE MESIN JACKPOT USER ---
  function initJackpot(users, usernamePilihan) {
    const container = document.getElementById('jackpotContainer');
    if (!container) return;
    container.innerHTML = '';
    
    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'jackpot-item';
      div.innerText = u.username;
      div.dataset.username = u.username;
      // Fitur Klik langsung menuju ke user tersebut
      div.onclick = () => div.scrollIntoView({ behavior: 'smooth', block: 'center' });
      container.appendChild(div);
    });

    // Event Listener Scroll untuk deteksi nama yang ditunjuk jarum
    container.addEventListener('scroll', () => {
      clearTimeout(container.scrollTimeout);
      container.scrollTimeout = setTimeout(updateActiveJackpot, 100);
    });

    // Posisikan awal ke username yang sedang login (delay dikit agar render beres)
    setTimeout(() => {
      const items = container.querySelectorAll('.jackpot-item');
      for (let item of items) {
        if (item.dataset.username === usernamePilihan) {
          item.scrollIntoView({ behavior: 'auto', block: 'center' });
          updateActiveJackpot(); // paksa update grafik
          break;
        }
      }
    }, 100);
  }

  function updateActiveJackpot() {
    const container = document.getElementById('jackpotContainer');
    const items = container.querySelectorAll('.jackpot-item');
    let closest = null;
    let minDistance = Infinity;
    const containerCenter = container.getBoundingClientRect().top + (container.offsetHeight / 2);

    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + (rect.height / 2);
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = item;
      }
    });

    if (closest && !closest.classList.contains('active')) {
      items.forEach(i => i.classList.remove('active'));
      closest.classList.add('active');
      renderChartPersonal(closest.dataset.username);
    }
  }

  // --- RENDER GRAFIK BAR PERSONAL ---
  function renderChartPersonal(username) {
    const barsContainer = document.getElementById('personalChart');
    if (!barsContainer) return;
    barsContainer.innerHTML = '';
    
    const array7Hari = get7HariSesi();
    const namaHariSingkat = { 'Sun':'Min', 'Mon':'Sen', 'Tue':'Sel', 'Wed':'Rab', 'Thu':'Kam', 'Fri':'Jum', 'Sat':'Sab' };
    
    let repHariIni = null;

    array7Hari.forEach((dateStr, index) => {
      const rep = globalReports.find(r => r.user === username && dapatkanTanggalSesi(r.created_at) === dateStr);
      const score = hitungSkorGrafik(rep);
      let heightPct = (score / 500) * 100;
      
      // Beri sedikit tinggi visual agar bar terlihat jika skor 0 (aesthetic purpose)
      if (heightPct < 2 && score > 0) heightPct = 2; 

      const d = new Date(dateStr);
      const labelText = namaHariSingkat[d.toDateString().split(' ')[0]];

      const group = document.createElement('div');
      group.className = 'chart-bar-group';
      
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${heightPct}%`;
      
      if (rep && rep['D-K'] === 2) bar.classList.add('izin');
      
      // Default bar paling kanan (hari ini) aktif duluan
      if (index === 6) {
         bar.classList.add('active');
         repHariIni = rep;
      }

      bar.addEventListener('click', () => {
        document.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
        bar.classList.add('active');
        
        const detailEl = document.getElementById('chartDetail');
        if (rep) {
          let juz = rep['T-J'] ? `Juz ${rep['T-J']}, ` : '';
          detailEl.innerHTML = `Rincian: ${juz}${getIkonAmaliyah(rep)}`;
        } else {
          detailEl.innerHTML = 'Kosong ➖ ➖ ➖ ➖ ➖';
        }
      });

      const lbl = document.createElement('div');
      lbl.className = 'bar-label';
      lbl.innerText = labelText;

      group.appendChild(bar);
      group.appendChild(lbl);
      barsContainer.appendChild(group);
    });

    // Update teks rincian sesuai dengan hari ini
    const detailEl = document.getElementById('chartDetail');
    if (repHariIni) {
      let juz = repHariIni['T-J'] ? `Juz ${repHariIni['T-J']}, ` : '';
      detailEl.innerHTML = `Rincian: ${juz}${getIkonAmaliyah(repHariIni)}`;
    } else {
      detailEl.innerHTML = 'Kosong ➖ ➖ ➖ ➖ ➖';
    }
  }


  // --- ENGINE TIMER COUNTDOWN & TIME-GATING BERBASIS JAM LOKAL ---
  function hitungDanAturWaktuLaporan() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    let target = new Date();
    
    if (jam >= 15 || jam < 8) {
      isSesiTerbuka = true;
      target.setHours(8, 0, 0, 0);
      if (jam >= 15) target.setDate(target.getDate() + 1);
    } else {
      isSesiTerbuka = false;
      target.setHours(15, 0, 0, 0);
    }

    const selisihMiliDetik = target - sekarang;
    const totalDetik = Math.floor(selisihMiliDetik / 1000);
    const h = Math.floor(totalDetik / 3600);
    const m = Math.floor((totalDetik % 3600) / 60);
    const s = totalDetik % 60;
    const teksWaktu = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (isSesiTerbuka) {
      if (timerReport) timerReport.innerHTML = `Sisa waktu laporan: <span class="timer-hijau">${teksWaktu}</span>`;
      if (btnKirimReport) {
        btnKirimReport.disabled = false;
        btnKirimReport.style.background = ""; 
        btnKirimReport.innerText = currentReportId ? "Update Laporan" : "Kirim Laporan";
      }
    } else {
      if (timerReport) timerReport.innerHTML = ""; 
      if (btnKirimReport) {
        btnKirimReport.disabled = true;
        btnKirimReport.innerText = `Buka kembali dalam ${teksWaktu}`;
        btnKirimReport.style.background = "#e74c3c"; 
      }
    }
  }
  setInterval(hitungDanAturWaktuLaporan, 1000);

  // --- FUNGSI MERENDER KARTU MUTABA'AH & BIDADARI SURGA ---
  async function muatDataKartuEkstra() {
    const sesiHariIni = dapatkanTanggalSesi(); 

    const { data: semuaLaporan } = await supabaseClient.from('table_data_report').select('*').order('created_at', { ascending: false }).limit(200);
    const laporanHariIni = semuaLaporan ? semuaLaporan.filter(r => dapatkanTanggalSesi(r.created_at) === sesiHariIni) : [];
    const { data: userAktif } = await supabaseClient.from('table_user').select('username').eq('status', true).order('username', { ascending: true });

    let htmlMutabaah = '';
    for(let i = 1; i <= 30; i++) {
      let repJuzList = laporanHariIni.filter(r => r['T-J'] === i);
      if (repJuzList.length > 0) {
        let usersHtml = '';
        repJuzList.forEach(repJuz => {
           usersHtml += `
             <div class="mutabaah-user-row">
               <span class="mutabaah-nama">${repJuz.user}</span>
               <span class="mutabaah-pemisah">|</span>
               <span class="mutabaah-skor">${getIkonAmaliyah(repJuz)}</span>
             </div>
           `;
        });
        htmlMutabaah += `
          <div class="mutabaah-item">
            <div class="juz-box">${i}</div>
            <div class="mutabaah-users">${usersHtml}</div>
          </div>
        `;
      } else {
        htmlMutabaah += `
          <div class="mutabaah-item mutabaah-kosong">
            <div class="juz-box">${i}</div>
            <div class="mutabaah-users">
              <div class="mutabaah-user-row"><span class="mutabaah-nama">Belum dilapor</span></div>
            </div>
          </div>
        `;
      }
    }
    const containerMutabaah = document.getElementById('listMutabaah');
    if(containerMutabaah) containerMutabaah.innerHTML = htmlMutabaah;

    let izin = [];
    let belumSelesai = [];
    let sudahSelesai = [];

    if (userAktif) {
      userAktif.forEach(u => {
        let repUser = laporanHariIni.find(r => r.user === u.username);
        if (!repUser) { belumSelesai.push(u.username); } 
        else if (repUser['D-K'] === 2) { izin.push(u.username); } 
        else if (isLengkap(repUser)) { sudahSelesai.push(u.username); } 
        else { belumSelesai.push(u.username); }
      });
    }

    let htmlBidadari = '';
    if (izin.length > 0) {
      izin.forEach(uname => {
        htmlBidadari += `
          <div class="bidadari-item bidadari-izin">
            <span>${uname}</span> 
            <span class="status-badge badge-kuning">Izin 🤍</span>
          </div>`;
      });
      htmlBidadari += `<hr class="garis-pembatas">`;
    }

    belumSelesai.forEach(uname => {
      htmlBidadari += `
        <div class="bidadari-item bidadari-belum">
          <span>${uname}</span> 
          <span class="status-badge badge-merah">Penyelesaian</span>
        </div>`;
    });

    if (sudahSelesai.length > 0) {
      htmlBidadari += `
        <hr class="garis-pembatas">
        <div class="pembatas-text">Baarakallaah, sudah berlapor:</div>
      `;
      sudahSelesai.forEach(uname => {
        htmlBidadari += `
          <div class="bidadari-item bidadari-sudah">
            <span>${uname}</span> 
            <span class="status-badge badge-hijau">Lengkap ✅</span>
          </div>`;
      });
    }

    if(htmlBidadari === '') htmlBidadari = '<div style="color:#7f8c8d;text-align:center;">Tidak ada data.</div>';
    const containerBidadari = document.getElementById('listBidadari');
    if(containerBidadari) containerBidadari.innerHTML = htmlBidadari;
  }

  // --- FUNGSI CEK LAPORAN HARI INI ---
  async function cekLaporanHariIni(username) {
    const sesiHariIni = dapatkanTanggalSesi(); 
    const { data, error } = await supabaseClient.from('table_data_report').select('*').eq('user', username).order('created_at', { ascending: false }).limit(1); 

    if (data && data.length > 0) {
      const report = data[0];
      const sesiReport = dapatkanTanggalSesi(report.created_at);
      if (sesiReport === sesiHariIni) {
        currentReportId = report.id;
        isiDanKunciForm(report);
        return;
      }
    }
    currentReportId = null;
    if (formReport) formReport.reset();
    bukaSemuaKunciForm();
  }

  // --- FUNGSI MENGUNCI FORM YANG SUDAH TERISI ---
  function isiDanKunciForm(rep) {
    const elTJ = document.getElementById('inputTJ');
    const elTilawah = document.getElementById('selectTilawah');
    const elDhuha = document.getElementById('selectDhuha');
    const elTahajjud = document.getElementById('selectTahajjud');
    const elFajar = document.getElementById('selectFajar');
    const elDzikir = document.getElementById('selectDzikir');

    if (elTJ) { if (rep['T-J'] !== null) { elTJ.value = rep['T-J']; elTJ.disabled = true; } else { elTJ.value = ''; elTJ.disabled = false; } }

    if (rep['D-K'] === 2) {
      if (elTilawah) { elTilawah.value = ''; elTilawah.disabled = true; }
      if (elDhuha) { elDhuha.value = ''; elDhuha.disabled = true; }
      if (elTahajjud) { elTahajjud.value = ''; elTahajjud.disabled = true; }
      if (elFajar) { elFajar.value = ''; elFajar.disabled = true; }
      if (elDzikir) { elDzikir.value = 'IZIN'; elDzikir.disabled = true; }
      return; 
    }

    if (elTilawah) {
      if (rep['T-K'] === 100) { elTilawah.value = 'T-K'; elTilawah.disabled = true; }
      else if (rep['T-TK'] === 0) { elTilawah.value = 'T-TK'; elTilawah.disabled = true; }
      else if (rep['T-M'] === 100) { elTilawah.value = 'T-M'; elTilawah.disabled = true; }
      else if (rep['T-T'] === 100) { elTilawah.value = 'T-T'; elTilawah.disabled = true; }
      else { elTilawah.value = ''; elTilawah.disabled = false; }
    }

    if (elDhuha) {
      if (rep['SD-D'] === 100) { elDhuha.value = 'SD-D'; elDhuha.disabled = true; }
      else if (rep['SD-TD'] === 0) { elDhuha.value = 'SD-TD'; elDhuha.disabled = true; }
      else if (rep['SD-H'] === 1) { elDhuha.value = 'SD-H'; elDhuha.disabled = true; }
      else { elDhuha.value = ''; elDhuha.disabled = false; }
    }

    if (elTahajjud) {
      if (rep['ST-T'] === 100) { elTahajjud.value = 'ST-T'; elTahajjud.disabled = true; }
      else if (rep['ST-TT'] === 0) { elTahajjud.value = 'ST-TT'; elTahajjud.disabled = true; }
      else if (rep['ST-H'] === 1) { elTahajjud.value = 'ST-H'; elTahajjud.disabled = true; }
      else { elTahajjud.value = ''; elTahajjud.disabled = false; }
    }

    if (elFajar) {
      if (rep['SF-F'] === 100) { elFajar.value = 'SF-F'; elFajar.disabled = true; }
      else if (rep['SF-TF'] === 0) { elFajar.value = 'SF-TF'; elFajar.disabled = true; }
      else if (rep['SF-H'] === 1) { elFajar.value = 'SF-H'; elFajar.disabled = true; }
      else { elFajar.value = ''; elFajar.disabled = false; }
    }

    if (elDzikir) {
      if (rep['D-K'] === 100) { elDzikir.value = 'D-K'; elDzikir.disabled = true; }
      else if (rep['D-PG'] === 50) { elDzikir.value = 'D-PG'; elDzikir.disabled = true; }
      else if (rep['D-PT'] === 50) { elDzikir.value = 'D-PT'; elDzikir.disabled = true; }
      else if (rep['D-TK'] === 0) { elDzikir.value = 'D-TK'; elDzikir.disabled = true; }
      else { elDzikir.value = ''; elDzikir.disabled = false; }
    }
  }

  function bukaSemuaKunciForm() {
    document.querySelectorAll('#formReport input, #formReport select').forEach(el => el.disabled = false);
  }

  // --- FUNGSI LOG MASUK ---
  btnBuka.addEventListener('click', async function() {
    const userVal = inputUsername.value.trim();
    const passVal = inputPassword.value.trim();

    pesanError.style.display = 'none';
    btnBuka.innerText = 'Memeriksa...'; 

    if (!userVal) {
      pesanError.innerText = "Username kosong wak!"; pesanError.style.display = 'block';
      btnBuka.innerText = 'LOGIN'; return;
    }

    const { data, error } = await supabaseClient.from('table_user').select('*').eq('username', userVal).single(); 

    if (error || !data) {
      pesanError.innerText = "Username tak ditemui!"; pesanError.style.display = 'block';
      btnBuka.innerText = 'LOGIN'; return;
    }

    if (data.status === false || data.status === null) {
      pesanError.innerText = "Akun tidak aktif."; pesanError.style.display = 'block';
      btnBuka.innerText = 'LOGIN'; return; 
    }

    const hashedInputPassword = await hashPassword(passVal);
    let loginBerhasil = false;
    if (!data.password || data.password === '') { loginBerhasil = true; } 
    else if (data.password === hashedInputPassword) { loginBerhasil = true; } 
    else { pesanError.innerText = "Password salah!"; pesanError.style.display = 'block'; }

    btnBuka.innerText = 'LOGIN'; 

    if (loginBerhasil) {
      currentUser = userVal; 
      loginLayer.classList.add('hilang'); 
      
      await cekLaporanHariIni(currentUser);
      hitungDanAturWaktuLaporan(); 
      muatDataKartuEkstra(); 

      setTimeout(() => { gerbangUtama.classList.add('terbuka'); inputUsername.value = ''; inputPassword.value = ''; }, 300);
    }
  });

  // --- FUNGSI LOGOUT ---
  btnTutup.addEventListener('click', function() {
    currentUser = ''; currentReportId = null;
    gerbangUtama.classList.remove('terbuka'); 
    setTimeout(() => { loginLayer.classList.remove('hilang'); }, 1500); 
    document.querySelector('.navbar a:first-child').click();
  });

  // --- FUNGSI HANTAR & UPDATE LAPORAN ---
  if(formReport) {
    formReport.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!isSesiTerbuka) { alert("Waktu pelaporan ditutup!"); return; }
      if (!currentUser) { alert("Sesi terputus!"); return; }

      btnKirimReport.innerText = "Memproses...";

      const valTJ = document.getElementById('inputTJ').value ? parseInt(document.getElementById('inputTJ').value) : null;
      const valTilawah = document.getElementById('selectTilawah').value;
      const valDhuha = document.getElementById('selectDhuha').value;
      const valTahajjud = document.getElementById('selectTahajjud').value;
      const valFajar = document.getElementById('selectFajar').value;
      const valDzikir = document.getElementById('selectDzikir').value;

      let payload = {};

      if (valDzikir === 'IZIN') {
        payload = {
          'T-K': 2, 'T-TK': null, 'T-M': null, 'T-T': null,
          'SD-D': 2, 'SD-TD': null, 'SD-H': null,
          'ST-T': 2, 'ST-TT': null, 'ST-H': null,
          'SF-F': 2, 'SF-TF': null, 'SF-H': null,
          'D-K': 2, 'D-PG': null, 'D-PT': null, 'D-TK': null
        };
        if (valTJ !== null) payload['T-J'] = valTJ;
        if (!currentReportId) payload.user = currentUser;

      } else {
        if (currentReportId) {
          if (valTJ !== null) payload['T-J'] = valTJ;
          if (valTilawah !== "") { if (valTilawah === 'T-K') payload['T-K'] = 100; else if (valTilawah === 'T-TK') payload['T-TK'] = 0; else if (valTilawah === 'T-M') payload['T-M'] = 100; else if (valTilawah === 'T-T') payload['T-T'] = 100; }
          if (valDhuha !== "") { if (valDhuha === 'SD-D') payload['SD-D'] = 100; else if (valDhuha === 'SD-TD') payload['SD-TD'] = 0; else if (valDhuha === 'SD-H') payload['SD-H'] = 1; }
          if (valTahajjud !== "") { if (valTahajjud === 'ST-T') payload['ST-T'] = 100; else if (valTahajjud === 'ST-TT') payload['ST-TT'] = 0; else if (valTahajjud === 'ST-H') payload['ST-H'] = 1; }
          if (valFajar !== "") { if (valFajar === 'SF-F') payload['SF-F'] = 100; else if (valFajar === 'SF-TF') payload['SF-TF'] = 0; else if (valFajar === 'SF-H') payload['SF-H'] = 1; }
          if (valDzikir !== "") { if (valDzikir === 'D-K') payload['D-K'] = 100; else if (valDzikir === 'D-PG') payload['D-PG'] = 50; else if (valDzikir === 'D-PT') payload['D-PT'] = 50; else if (valDzikir === 'D-TK') payload['D-TK'] = 0; }
          
          if (Object.keys(payload).length === 0) {
            alert("Tidak ada data baru wak."); hitungDanAturWaktuLaporan(); return;
          }
        } else {
          payload = { user: currentUser, 'T-J': valTJ };
          ['T-K', 'T-TK', 'T-M', 'T-T'].forEach(c => payload[c] = null); if (valTilawah === 'T-K') payload['T-K'] = 100; else if (valTilawah === 'T-TK') payload['T-TK'] = 0; else if (valTilawah === 'T-M') payload['T-M'] = 100; else if (valTilawah === 'T-T') payload['T-T'] = 100;
          ['SD-D', 'SD-TD', 'SD-H'].forEach(c => payload[c] = null); if (valDhuha === 'SD-D') payload['SD-D'] = 100; else if (valDhuha === 'SD-TD') payload['SD-TD'] = 0; else if (valDhuha === 'SD-H') payload['SD-H'] = 1;
          ['ST-T', 'ST-TT', 'ST-H'].forEach(c => payload[c] = null); if (valTahajjud === 'ST-T') payload['ST-T'] = 100; else if (valTahajjud === 'ST-TT') payload['ST-TT'] = 0; else if (valTahajjud === 'ST-H') payload['ST-H'] = 1;
          ['SF-F', 'SF-TF', 'SF-H'].forEach(c => payload[c] = null); if (valFajar === 'SF-F') payload['SF-F'] = 100; else if (valFajar === 'SF-TF') payload['SF-TF'] = 0; else if (valFajar === 'SF-H') payload['SF-H'] = 1;
          ['D-K', 'D-PG', 'D-PT', 'D-TK'].forEach(c => payload[c] = null); if (valDzikir === 'D-K') payload['D-K'] = 100; else if (valDzikir === 'D-PG') payload['D-PG'] = 50; else if (valDzikir === 'D-PT') payload['D-PT'] = 50; else if (valDzikir === 'D-TK') payload['D-TK'] = 0;
        }
      }

      if (currentReportId) {
        const { error } = await supabaseClient.from('table_data_report').update(payload).eq('id', currentReportId);
        if (error) alert("Gagal update: " + error.message);
        else {
          alert("Laporan berhasil diupdate!");
          await cekLaporanHariIni(currentUser);
          muatDataKartuEkstra(); 
          hitungDanAturWaktuLaporan();
        }
      } else {
        const { error } = await supabaseClient.from('table_data_report').insert([payload]);
        if (error) alert("Gagal kirim: " + error.message);
        else {
          alert("Laporan berhasil dikirim!");
          await cekLaporanHariIni(currentUser);
          muatDataKartuEkstra(); 
          hitungDanAturWaktuLaporan();
        }
      }
    });
  }
});
