const mongoose = require('mongoose');
const LibraryBook = require('./models/LibraryBook'); // Modeli çağırdık
const books = require('./data/books'); // Verileri çağırdık

// Veritabanı Bağlantısı
const dbURL = 'mongodb+srv://akiferz2004_db_user:Akiferz1.@cluster0.fuenfsu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURL)
    .then(async () => {
        console.log('🔌 Veritabanına bağlandı...');

        // 1. Önce eski verileri temizleyelim (Çakışma olmasın diye)
        // Eğer üzerine eklesin istersen bu satırı sil.
        await LibraryBook.deleteMany({});
        console.log('🗑️  Eski kitap havuzu temizlendi.');

        // 2. Yeni listeyi yükle
        await LibraryBook.insertMany(books);
        console.log(`✅ ${books.length} adet kitap başarıyla yüklendi!`);

        // 3. İşi bitince bağlantıyı kes ve çık
        mongoose.connection.close();
        process.exit();
    })
    .catch(err => {
        console.error('❌ Hata:', err);
        process.exit(1);
    });