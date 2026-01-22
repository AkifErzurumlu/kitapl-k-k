const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    // YENİ: Artık özetler burada, herkes için ortak tutulacak
    content: { type: String, default: "Henüz bir özet eklenmemiş." } 
});

module.exports = mongoose.model('LibraryBook', libraryBookSchema);