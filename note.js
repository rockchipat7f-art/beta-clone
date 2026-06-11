const supabaseUrl = 'https://udlnluanzqlxpvdpzzzh.supabase.co'; 
const supabaseKey = 'sb_publishable_wqhi-fyHbJEzsh0FYG7tvw_zJGdDPHr'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Nama tabel sesuai database-mu
const NAMA_TABEL = 'note'; 

const txtUmmi = document.getElementById('note-ummi');
const txtRohmad = document.getElementById('note-rohmad');
const btnUmmi = document.getElementById('btn-ummi');
const btnRohmad = document.getElementById('btn-rohmad');

// 1. Ambil data dari baris id: 1 saat web dibuka
async function loadData() {
    const { data, error } = await supabaseClient
        .from(NAMA_TABEL)
        .select('tabel_kiri, "tabel kanan"') // Kolom berkutip karena ada spasi
        .eq('id', 1)
        .single();

    if (error) console.error('Gagal memuat data:', error);
    if (data) {
        txtUmmi.value = data.tabel_kiri || '';
        txtRohmad.value = data['tabel kanan'] || ''; // Ambil data dari kolom berspasi
    }
}

// 2. Tombol Simpan Ummi (Update kolom tabel_kiri)
btnUmmi.addEventListener('click', async () => {
    btnUmmi.innerText = 'Menyimpan...';
    const { error } = await supabaseClient
        .from(NAMA_TABEL)
        .update({ tabel_kiri: txtUmmi.value })
        .eq('id', 1);

    btnUmmi.innerText = 'Simpan Catatan Ummi';
    if (error) alert('Gagal menyimpan catatan Ummi wakk!');
    else alert('Catatan Ummi berhasil diperbarui!');
});

// 3. Tombol Simpan Rohmad (Update kolom tabel kanan)
btnRohmad.addEventListener('click', async () => {
    btnRohmad.innerText = 'Menyimpan...';
    const { error } = await supabaseClient
        .from(NAMA_TABEL)
        .update({ 'tabel kanan': txtRohmad.value }) // Update kolom berspasi
        .eq('id', 1);

    btnRohmad.innerText = 'Simpan Catatan Rohmad';
    if (error) alert('Gagal menyimpan catatan Rohmad wakk!');
    else alert('Catatan Rohmad berhasil diperbarui!');
});

// Jalankan fungsi load data saat halaman selesai dimuat
loadData();
