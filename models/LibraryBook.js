const mongoose = require('mongoose');

const LibrarySchema = new mongoose.Schema({
    title: String,
    author: String,
    type: String
});

module.exports = mongoose.model('LibraryBook', LibrarySchema);