const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();

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
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    books: [{ 
        title: String,
        author: String 
    }]
});
const User = mongoose.model('User', UserSchema);

// --- SAYFALAR (ROUTE'LAR) ---

// Ana Sayfa Yönlendirmesi
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/books');
    res.redirect('/login');
});

// Giriş & Kayıt & Çıkış
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

// --- İŞTE EKSİK OLAN KISIMLAR GERİ GELDİ ---

// 1. Kitap Listesi
// 1. Kitap Listesi
app.get('/books', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    // ARTIK 'books.ejs' DOSYASINI AÇACAK
    res.render('books', { 
        books: user.books 
    }); 
});


// 2. Kitap Ekleme Sayfası (GET) -> ARTIK ÇALIŞACAK
app.get('/add', requireLogin, (req, res) => {
    res.render('add-book'); 
});

// 3. Kitap Ekleme İşlemi (POST)
app.post('/add-book', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books.push({ title: req.body.title, author: req.body.author });
    await user.save();
    res.redirect('/books');
});

// 4. Kitap Silme
app.post('/delete-book/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books = user.books.filter(b => b._id.toString() !== req.params.id);
    await user.save();
    res.redirect('/books');
});

// 5. Hakkımda Sayfası (GET) -> ARTIK ÇALIŞACAK
app.get('/about', requireLogin, (req, res) => {
    res.render('about');
});