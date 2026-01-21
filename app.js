const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const LibraryBook = require('./models/LibraryBook'); // 1. Tanımlama burada (Doğru)

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

// 1. Kullanıcı Modeli
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    books: [{ title: String, author: String }]
});
const User = mongoose.model('User', UserSchema);

// (BURADAKİ HATALI İKİNCİ TANIMLAMAYI SİLDİM) - Artık hata vermeyecek.

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

// 3. Hoş Geldin Ekranı
app.get('/books', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('index', { 
        totalBooks: user.books.length 
    }); 
});

// 4. Kitap Listesi
app.get('/list', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('books', { 
        books: user.books 
    }); 
});

// 5. Kitap Ekleme Sayfası (Düzeltildi: Veriyi gönderiyor)
app.get('/add', requireLogin, async (req, res) => {
    const library = await LibraryBook.find({}); 
    res.render('add-book', { library: library }); 
});

// --- KİTAP İŞLEMLERİ (POST) ---

// 6. Kitap Kaydetme
app.post('/add-book', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books.push({ title: req.body.title, author: req.body.author });
    await user.save();
    res.redirect('/list');
});

// 7. Öneri Sistemi (Düzeltildi: 's' harfi silindi)
app.get('/recommend', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        // GÜVENLİK ÖNLEMİ: Sadece başlığı (title) olan kitapları al, yoksa boş geç
        const myBookTitles = user.books.map(b => {
            return b.title ? b.title.toLowerCase().trim() : "";
        });

        // Veritabanından havuzu çek
        const libraryPool = await LibraryBook.find({});

        // Filtreleme
        const recommendations = libraryPool.filter(poolBook => {
            // Eğer havuzdaki kitabın adı yoksa (hata varsa) onu da ele
            if (!poolBook.title) return false;
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

    } catch (error) {
        console.error("Öneri Sistemi Hatası:", error);
        res.send("Bir hata oluştu: " + error.message);
    }
});


// 8. Kitap Silme
app.post('/delete-book/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    user.books = user.books.filter(b => b._id.toString() !== req.params.id);
    await user.save();
    res.redirect('/list');
});

// 9. Hakkımda
app.get('/about', requireLogin, (req, res) => {
    res.render('about');
});