const supabaseUrl = 'https://udlnluanzqlxpvdpzzzh.supabase.co'; 
const supabaseKey = 'sb_publishable_wqhi-fyHbJEzsh0FYG7tvw_zJGdDPHr'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Pastikan nama tabel kamu di Supabase disesuaikan di bawah ini (contoh: 'notes')
const NAMA_TABEL = 'note'; 

const txtUmmi = document.getElementById('note-ummi');
const txtRohmad = document.getElementById('note-rohmad');
const btnUmmi = document.getElementById('btn-ummi');
const btnRohmad = document.getElementById('btn-rohmad');

// 1. Ambil data yang sudah ada di database saat web dibuka
async function loadData() {
    const { data, error } = await supabaseClient
        .from(NAMA_TABEL)
        .select('tabel_kiri, tabel_kanan')
        .eq('id', 1)
        .single();

    if (error) console.error('Gagal memuat data:', error);
    if (data) {
        txtUmmi.value = data.tabel_kiri || '';
        txtRohmad.value = data.tabel_kanan || '';
    }
}

// 2. Tombol Simpan untuk Ummi (Update kolom tabel_kiri)
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

// 3. Tombol Simpan untuk Rohmad (Update kolom tabel_kanan)
btnRohmad.addEventListener('click', async () => {
    btnRohmad.innerText = 'Menyimpan...';
    const { error } = await supabaseClient
        .from(NAMA_TABEL)
        .update({ tabel_kanan: txtRohmad.value })
        .eq('id', 1);

    btnRohmad.innerText = 'Simpan Catatan Rohmad';
    if (error) alert('Gagal menyimpan catatan Rohmad wakk!');
    else alert('Catatan Rohmad berhasil diperbarui!');
});

// Jalankan fungsi load data saat halaman selesai dimuat
loadData();
