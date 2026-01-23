const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
// --- ADMIN AYARI (Burası Çok Önemli) ---
const ADMIN_USERNAME = "akiferz"; // BURAYA KENDİ KULLANICI ADINI YAZ (Tırnak içinde)

// --- 1. MODEL TANIMLAMALARI ---
const LibraryBook = require('./models/LibraryBook'); // Kitap havuzu modelimiz

// --- 2. AYARLAR ---
app.set('view engine', 'ejs'); // Görünüm motoru EJS
app.use(express.static('public')); // CSS ve resimler için klasör
app.use(express.urlencoded({ extended: true })); // Form verilerini okumak için

// Oturum (Session) Ayarları
app.use(session({
    secret: 'gizli-anahtar',
    resave: false,
    saveUninitialized: true
}));

// --- 3. GÜVENLİK KONTROLÜ (Middleware) ---
// Giriş yapmamış kullanıcıyı engelleme fonksiyonu
const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    next();
};

// --- 4. VERİTABANI BAĞLANTISI ---
const dbURL = 'mongodb+srv://akiferz2004_db_user:Akiferz1.@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

mongoose.connect(dbURL)
    .then(() => {
        console.log('✅ Veritabanına BAĞLANDI!');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`));
    })
    .catch((err) => console.error('❌ Bağlantı HATASI:', err));

// --- 5. KULLANICI MODELİ (GÜNCELLENDİ: OKUNDU BİLGİSİ EKLENDİ) ---
// --- 5. KULLANICI MODELİ ---
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    books: [{ 
        title: String, 
        author: String,
        isRead: { type: Boolean, default: false },
        content: { type: String, default: "" } // YENİ: Kitap metni burada saklanacak
    }]
}));

// ============================================
//               ROTALAR (SAYFALAR)
// ============================================

// --- ANA YÖNLENDİRME (Landing Page - GÜNCELLENDİ) ---

// YENİSİ (BUNU YAPIŞTIR)
app.get('/', async (req, res) => {
    let user = null;
    
    // Eğer kullanıcı zaten giriş yapmışsa bilgilerini çekiyoruz
    if (req.session.userId) {
        user = await User.findById(req.session.userId);
    }

    // Sayfaya hem kullanıcıyı hem de boş bir hata değişkenini gönderiyoruz
    res.render('landing', { user: user, error: null }); 
});
// --- GİRİŞ VE KAYIT İŞLEMLERİ (AUTH) ---

// Giriş Sayfası
app.get('/login', (req, res) => res.render('login', { error: null }));

// Giriş Yapma İşlemi
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        return res.redirect('/books');
    }
    res.render('login', { error: 'Hatalı giriş!' });
});

// Kayıt Ol Sayfası
app.get('/register', (req, res) => res.render('register', { error: null }));

// Kayıt Olma İşlemi
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await User.create({ username: req.body.username, password: hashedPassword });
        res.redirect('/login');
    } catch {
        res.render('register', { error: 'Kullanıcı adı alınmış!' });
    }
});

// --- ÇIKIŞ YAPMA (Logout) ---
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/'); // DÜZELTME: Artık ana sayfaya (Landing) atıyor.
    });
});

// --- ANA SAYFALAR ---

// --- ANA DASHBOARD (Giriş Sonrası Ekran - GÜNCELLENDİ) ---
app.get('/books', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('index', { user: user }); // Kullanıcıyı sayfaya gönder
});

// Kitap Listesi Sayfası
app.get('/list', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('books', { books: user ? user.books : [] }); 
});

// --- KİTAP EKLEME İŞLEMLERİ (CREATE) ---

// Kitap Ekleme Sayfasını Aç
app.get('/add', requireLogin, async (req, res) => {
    try {
        const library = await LibraryBook.find({}); 
        res.render('add-book', { library: library });
    } catch (err) {
        res.render('add-book', { library: [] });
    }
});

// --- A. KİTAP EKLEME (GÜNCELLE) ---
app.post('/add-book', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (user) {
        user.books.push({ 
            title: req.body.title, 
            author: req.body.author,
            content: req.body.content // YENİ: Metni al
        });
        await user.save();
    }
    res.redirect('/list');
});

// --- KİTAP DÜZENLEME İŞLEMLERİ (UPDATE) ---

// 1. Düzenleme Sayfasını Aç
app.get('/edit/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const book = user.books.id(req.params.id); // Düzenlenecek kitabı bul
    
    if (!book) return res.redirect('/list');
    
    res.render('edit-book', { book: book });
});

// --- B. KİTAP DÜZENLEME (GÜNCELLENDİ: SADECE ADMIN HERKESİ ETKİLER) ---
app.post('/edit/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const userBook = user.books.id(req.params.id);
    
    if (userBook) {
        // 1. Herkes kendi kişisel listesindeki başlığı/yazarı düzeltebilir
        userBook.title = req.body.title;
        userBook.author = req.body.author;
        
        // Kişisel yedeği de güncelleyelim (Admin değilse bile kendi yedeği olsun)
        userBook.content = req.body.content; 
        
        await user.save();

        // 2. GÜVENLİK KONTROLÜ: Kullanıcı ADMIN ise, Ana Kütüphaneyi de günceller
        if (user.username === ADMIN_USERNAME) {
            await LibraryBook.findOneAndUpdate(
                { title: userBook.title }, // İsmi eşleşen kitabı bul
                { content: req.body.content, author: req.body.author }, // İçeriği güncelle
                { upsert: true } // Yoksa oluştur
            );
            console.log("👑 ADMIN: Ortak kütüphane güncellendi.");
        } else {
            console.log("👤 USER: Sadece kişisel liste güncellendi.");
        }
    }
    res.redirect('/list');
});

// --- OKUNDU / OKUNMADI İŞARETLEME (YENİ EKLENEN KISIM) ---
app.post('/toggle-read/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const book = user.books.id(req.params.id);
    
    if (book) {
        // Durum neyse tersini yap (True ise False, False ise True)
        book.isRead = !book.isRead; 
        await user.save();
    }
    res.redirect('/list');
});

// --- KİTAP SİLME İŞLEMİ (DELETE) ---
app.post('/delete-book/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (user) {
        user.books = user.books.filter(b => b._id.toString() !== req.params.id);
        await user.save();
    }
    res.redirect('/list');
});
// --- C. OKUMA SAYFASI (GÜNCELLENDİ: YORUMLARI DA GETİRİR) ---
app.get('/read/:id', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const userBook = user.books.id(req.params.id);

    if (!userBook) return res.redirect('/list');

    // Ortak kütüphaneden kitabı bul (Yorumlar orada!)
    const globalBook = await LibraryBook.findOne({ title: userBook.title });

    // İçeriği ve Yorumları belirle
    const contentToShow = globalBook ? globalBook.content : userBook.content;
    const commentsToShow = globalBook ? globalBook.comments : []; // Yorum yoksa boş liste gönder

    res.render('read-book', { 
        book: userBook, 
        content: contentToShow,
        comments: commentsToShow // Yorumları sayfaya gönderdik
    });
});

// --- D. YORUM YAPMA İŞLEMİ (YENİ ROTA) ---
app.post('/comment', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    const { bookTitle, commentText, redirectId } = req.body; // Formdan gelen veriler

    if (user && commentText.trim() !== "") {
        // Yorumu Ortak Kütüphaneye Ekle
        await LibraryBook.findOneAndUpdate(
            { title: bookTitle }, // Kitabı bul
            { 
                $push: { // Listeye yeni yorum ekle
                    comments: {
                        username: user.username,
                        text: commentText
                    }
                }
            },
            { upsert: true } // Kitap havuzda yoksa oluştur
        );
    }
    // Kullanıcıyı tekrar okuma sayfasına gönder
    res.redirect('/read/' + redirectId);
});

// --- EKSTRA ÖZELLİKLER ---

// Öneri Sistemi
app.get('/recommend', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        // Kullanıcının kitaplarını küçük harfe çevirip listele
        const myBookTitles = user.books
            .filter(b => b && b.title)
            .map(b => b.title.toLowerCase().trim());

        const libraryPool = await LibraryBook.find({});

        // Havuzdan kullanıcının kitaplarını çıkar
        const recommendations = libraryPool.filter(poolBook => {
            if (!poolBook || !poolBook.title) return false;
            return !myBookTitles.includes(poolBook.title.toLowerCase().trim());
        });

        // Rastgele 3 tane seç
        let randomRecommendations = [];
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
        console.error("HATA:", error);
        res.status(500).send("Öneriler yüklenirken bir hata oluştu: " + error.message);
    }
});

// Hakkımda Sayfası
app.get('/about', requireLogin, (req, res) => res.render('about'));