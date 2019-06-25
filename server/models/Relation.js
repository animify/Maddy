const mongoose = require('mongoose');

module.exports = mongoose.model('Relation', new mongoose.Schema({ id: String, url: String }));
