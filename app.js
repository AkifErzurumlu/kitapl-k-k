const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // Şifre şifreleme için
const app = express();

// --- VERİTABANI BAĞLANTISI ---
const dbURL = 'mongodb+srv://akiferz2004_db_user:DA3uWU8NX4GNSk4e@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURL)
    .then(() => console.log('✅ Veritabanına Bağlandı!'))
    .catch((err) => console.log('❌ Hata:', err));

// --- MODELLER ---

// 1. Kullanıcı Modeli
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 2. Kitap Modeli (Sahibi 'owner' alanı ile belirlenir)
const bookSchema = new mongoose.Schema({
    title: String,
    author: String,
    year: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Kitabın sahibi kim?
}, { timestamps: true });
const Book = mongoose.model('Book', bookSchema);

// --- AYARLAR ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'gizli_anahtar_kelime_cok_gizli',
    resave: false,
    saveUninitialized: false
}));

// --- MIDDLEWARE (Giriş Kontrolü) ---
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// --- ROTALAR ---

// 1. Kayıt Ol Sayfası
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // Kullanıcı zaten var mı?
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.render('register', { error: 'Bu kullanıcı adı zaten alınmış!' });

    // Şifreyi şifrele (Hash)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kaydet
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    res.redirect('/login');
});

// 2. Giriş Yap Sayfası
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    // Kullanıcı var mı ve şifre doğru mu?
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id; // Oturumu başlat
        res.redirect('/');
    } else {
        res.render('login', { error: 'Kullanıcı adı veya şifre hatalı!' });
    }
});

// 3. Çıkış Yap
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// --- KORUMALI ALANLAR (Sadece Giriş Yapanlar) ---

// Anasayfa
app.get('/', requireLogin, async (req, res) => {
    // Sadece giriş yapan kullanıcının kitaplarını say
    const count = await Book.countDocuments({ owner: req.session.userId });
    res.render('index', { totalBooks: count });
});

// Kitap Listesi
app.get('/books', requireLogin, async (req, res) => {
    // Sadece giriş yapan kullanıcının kitaplarını getir ({ owner: ... })
    const books = await Book.find({ owner: req.session.userId }).sort({ createdAt: -1 });
    res.render('books', { books });
});

// Kitap Ekleme
app.get('/add', requireLogin, (req, res) => res.render('add-book'));

app.post('/add', requireLogin, async (req, res) => {
    const book = new Book({
        title: req.body.title,
        author: req.body.author,
        year: req.body.year,
        owner: req.session.userId // Kitabı ekleyeni kaydet
    });
    await book.save();
    res.redirect('/books');
});

// Düzenleme
app.get('/edit/:id', requireLogin, async (req, res) => {
    const book = await Book.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!book) return res.redirect('/books');
    res.render('edit-book', { book });
});

app.post('/edit/:id', requireLogin, async (req, res) => {
    await Book.findOneAndUpdate(
        { _id: req.params.id, owner: req.session.userId }, // Sadece kendi kitabını güncelleyebilir
        req.body
    );
    res.redirect('/books');
});

// Silme
app.get('/delete/:id', requireLogin, async (req, res) => {
    await Book.findOneAndDelete({ _id: req.params.id, owner: req.session.userId });
    res.redirect('/books');
});

app.get('/about', requireLogin, (req, res) => res.render('about'));

// Eski hali: app.listen(3000, ...);

// Yeni Hali (Bunu yapıştır):
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor...`));