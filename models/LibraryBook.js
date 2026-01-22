const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
    // Kitap Adı ve Yazarı (Zaten vardı)
    title: { type: String, required: true },
    author: { type: String, required: true },
    
    // Kitap Özeti/İçeriği (Geçen adımda eklemiştik)
    content: { type: String, default: "" },

    // --- YENİ EKLENEN KISIM: YORUMLAR ---
    comments: [{
        username: String, // Yorumu kim yazdı?
        text: String,     // Ne yazdı?
        date: { type: Date, default: Date.now } // Ne zaman yazdı?
    }]
});

module.exports = mongoose.model('LibraryBook', libraryBookSchema);