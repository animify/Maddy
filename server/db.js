const mongoose = require('mongoose');
const uri = 'mongodb+srv://animify:Password00@reel-yrzwb.mongodb.net/test?retryWrites=true&w=majority';
mongoose.connect(uri, { useNewUrlParser: true });
