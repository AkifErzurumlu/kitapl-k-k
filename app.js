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

// --- VERİTABANI BAĞLANTISI ---
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
    books: [{ 
        title: String,
        author: String,
        isRead: { type: Boolean, default: false }
    }]
});
const User = mongoose.model('User', UserSchema);

// --- ROUTE'LAR ---

app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/books');
    }
    res.redirect('/login');
});

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

// --- DÜZELTİLEN KISIM BURASI ---
app.get('/books', requireLogin, async (req, res) => {
    // Sadece giriş yapan kullanıcının kitaplarını getir ({ owner: ... })
    const books = await Book.find({ owner: req.session.userId }).sort({ createdAt: -1 });
    res.render('books', { books });
    
    // BURAYI DÜZELTTİK: totalBooks'u artık gönderiyoruz!
    res.render('index', { 
        books: user.books, 
        user: user,
        totalBooks: user.books.length 
    }); 
});

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

app.get('/delete/:id', requireLogin, async (req, res) => {
    await Book.findOneAndDelete({ _id: req.params.id, owner: req.session.userId });
    res.redirect('/books');
});

app.get('/about', requireLogin, (req, res) => res.render('about'));

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
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
// Kitap Listesi
app.get('/books', requireLogin, async (req, res) => {
    // Sadece giriş yapan kullanıcının kitaplarını getir ({ owner: ... })
    const books = await Book.find({ owner: req.session.userId }).sort({ createdAt: -1 });
    res.render('books', { books });
});
// Anasayfa
app.get('/', requireLogin, async (req, res) => {
    // Sadece giriş yapan kullanıcının kitaplarını say
    const count = await Book.countDocuments({ owner: req.session.userId });
    res.render('index', { totalBooks: count });
});