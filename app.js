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

// --- VERİTABANI BAĞLANTISI (Buraya Kendi Linkini Yapıştır) ---
// DİKKAT: <password> yerine 123456 yazmayı unutma!
const dbURL = 'const dbURL = mongodb+srv://akiferz2004_db_user:Akiferz1.@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';; 

mongoose.connect(dbURL)
    .then(() => {
        console.log('✅ Veritabanına BAĞLANDI!');
        // Sunucuyu sadece veritabanı bağlandıktan sonra başlat
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`));
    })
    .catch((err) => {
        console.error('❌ Veritabanı Bağlantı HATASI:', err);
    });

// --- MODELLER (ŞEMALAR) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    books: [{ 
        title: String,
        author: String,
        isRead: { type: Boolean, default: false }
    }]
});
const User = mongoose.model('User', UserSchema);

// --- ROUTE'LAR (YÖNLENDİRMELER) ---

// Ana Sayfa (Giriş Kontrolü)
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/books');
    }
    res.redirect('/login');
});

// Giriş Sayfası
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

// Kayıt Sayfası
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

// Kitaplar Sayfası (Korumalı)
app.get('/books', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const user = await User.findById(req.session.userId);
    res.render('index', { books: user.books, user: user }); // 'index.ejs' kullanıyoruz
       // BURAYI DÜZELTTİK: totalBooks'u artık gönderiyoruz!
    res.render('index', { 
        books: user.books, 
        user: user,
        totalBooks: user.books.length 
    }); 
});

// Kitap Ekleme
app.post('/add-book', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const { title, author } = req.body;
    const user = await User.findById(req.session.userId);
    user.books.push({ title, author });
    await user.save();
    res.redirect('/books');
});

// Kitap Silme
app.post('/delete-book/:id', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const user = await User.findById(req.session.userId);
    user.books = user.books.filter(book => book._id.toString() !== req.params.id);
    await user.save();
    res.redirect('/books');
});

// Çıkış Yap
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});