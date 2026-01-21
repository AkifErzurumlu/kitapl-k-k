const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();

// --- AYARLAR ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session Ayarları
app.use(session({
    secret: 'gizli-anahtar',
    resave: false,
    saveUninitialized: true
}));

// --- MIDDLEWARE (Eksik Olan Parça Buydu!) ---
// Giriş yapılıp yapılmadığını kontrol eden fonksiyon
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// --- VERİTABANI BAĞLANTISI ---
// (Şifreni senin yazdığın gibi Akiferz1. olarak bıraktım)
const dbURL = 'mongodb+srv://akiferz2004_db_user:Akiferz1.@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

mongoose.connect(dbURL)
    .then(() => {
        console.log('✅ Veritabanına BAĞLANDI!');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`));
    })
    .catch((err) => {
        console.error('❌ Veritabanı Bağlantı HATASI:', err);
    });

// --- MODELLER ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Kitapları kullanıcının içinde tutuyoruz (Senin yapın bu)
    books: [{ 
        title: String,
        author: String,
        isRead: { type: Boolean, default: false }
    }]
});
const User = mongoose.model('User', UserSchema);

// --- ROUTE'LAR (SAYFALAR) ---

// Ana Sayfa Yönlendirmesi
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/books');
    }
    res.redirect('/login');
});

// Giriş İşlemleri
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        return res.redirect('/books');
    }
    res.render('login', { error: 'Kullanıcı adı veya şifre hatalı!' });
});

// Kayıt İşlemleri
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.redirect('/login');
    } catch (err) {
        res.render('register', { error: 'Bu kullanıcı adı zaten alınmış!' });
    }
});

// --- KİTAP İŞLEMLERİ (Burayı senin yapına göre düzelttim) ---

// Kitapları Listeleme
app.get('/books', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    // index.ejs sayfasına tüm verileri gönderiyoruz
    res.render('index', { 
        books: user.books, 
        user: user,
        totalBooks: user.books.length 
    }); 
});

// Kitap Ekleme
app.post('/add-book', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books.push({
        title: req.body.title,
        author: req.body.author
    });
    await user.save();
    res.redirect('/books');
});

// Kitap Silme
app.post('/delete-book/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books = user.books.filter(book => book._id.toString() !== req.params.id);
    await user.save();
    res.redirect('/books');
});

// Çıkış Yapma
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});