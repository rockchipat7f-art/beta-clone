// Ganti dengan kredensial dari dashboard Supabase-mu
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const titleInput = document.getElementById('note-title');
const contentInput = document.getElementById('note-content');
const addBtn = document.getElementById('add-btn');
const notesList = document.getElementById('notes-list');

// Fungsi ambil data
async function fetchNotes() {
    const { data, error } = await supabase
        .from('notes') // Pastikan nama table di Supabase adalah 'notes'
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else renderNotes(data);
}

// Fungsi tampilkan data ke HTML
function renderNotes(notes) {
    notesList.innerHTML = '';
    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p>`;
        notesList.appendChild(div);
    });
}

// Fungsi tambah data
addBtn.addEventListener('click', async () => {
    const title = titleInput.value;
    const content = contentInput.value;

    if (!title || !content) return alert('Isi dulu wakk!');

    const { error } = await supabase
        .from('notes')
        .insert([{ title, content }]);

    if (error) alert('Gagal simpan!');
    else {
        titleInput.value = '';
        contentInput.value = '';
        fetchNotes();
    }
});

// Jalankan saat load pertama kali
fetchNotes();
