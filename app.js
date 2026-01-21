const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const LibraryBook = require('./models/LibraryBook');

// --- AYARLAR ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: 'gizli-anahtar',
    resave: false,
    saveUninitialized: true
}));

// --- GİRİŞ KONTROLÜ (Middleware) ---
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// --- VERİTABANI BAĞLANTISI ---
const dbURL = 'mongodb+srv://akiferz2004_db_user:Akiferz1.@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

mongoose.connect(dbURL)
    .then(() => {
        console.log('✅ Veritabanına BAĞLANDI!');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`));
    })
    .catch((err) => console.error('❌ Bağlantı HATASI:', err));

// --- MODELLER ---

// 1. Kullanıcı Modeli (Zaten vardı)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    books: [{ title: String, author: String }]
});
const User = mongoose.model('User', UserSchema);

// 2. YENİ: Genel Kitap Havuzu Modeli (Sanal Kütüphane)
const LibrarySchema = new mongoose.Schema({
    title: String,
    author: String,
    type: String
});
const LibraryBook = require('./models/LibraryBook');
// --- ROUTE'LAR (SAYFALAR) ---

// 1. Ana Yönlendirme
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/books');
    res.redirect('/login');
});

// 2. Giriş & Kayıt & Çıkış
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        return res.redirect('/books');
    }
    res.render('login', { error: 'Hatalı giriş!' });
});
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await User.create({ username: req.body.username, password: hashedPassword });
        res.redirect('/login');
    } catch {
        res.render('register', { error: 'Kullanıcı adı alınmış!' });
    }
});
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// --- ANA SAYFALAR ---

// 3. Hoş Geldin Ekranı (Bu senin hatanın sebebiydi, düzelttim)
app.get('/books', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('index', { 
        totalBooks: user.books.length 
    }); 
});

// 4. Kitap Listesi (YENİ SAYFA)
app.get('/list', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('books', { 
        books: user.books 
    }); 
});

// --- 1. EKSİK PARÇA: Kitap Kaydetme (POST) ---
// Formdan gelen veriyi veritabanına kaydeder
app.post('/add-book', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books.push({ title: req.body.title, author: req.body.author });
    await user.save();
    res.redirect('/list'); // Kaydettikten sonra listeye atar
});
// --- 2. EKSİK PARÇA: Öneri Sistemi (GET) ---
// "Bana Öner" sayfasını açar
app.get('/recommend', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const myBookTitles = user.books.map(b => b.title.toLowerCase().trim());

    // Veritabanından (LibraryBook) havuzu çek
    const libraryPool = await LibraryBook.find({});

    // Senin kitaplarını havuzdan ele
    const recommendations = libraryPool.filter(poolBook => {
        return !myBookTitles.includes(poolBook.title.toLowerCase().trim());
    });

    // Rastgele 3 tane seç
    const randomRecommendations = [];
    if (recommendations.length > 0) {
        const count = Math.min(3, recommendations.length); 
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * recommendations.length);
            randomRecommendations.push(recommendations[randomIndex]);
            recommendations.splice(randomIndex, 1);
        }
    }

    res.render('recommend', { suggestions: randomRecommendations });
});

// 7. Kitap Silme
app.post('/delete-book/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books = user.books.filter(b => b._id.toString() !== req.params.id);
    await user.save();
    res.redirect('/list'); // Sildikten sonra listeye gitsin
});

// 8. Hakkımda
app.get('/about', requireLogin, (req, res) => {
    res.render('about');
});