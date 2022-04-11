var mongoose = require('mongoose');
var Schema = mongoose.Schema;


mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

// user schema
var MovieSchema = new Schema({
    title: {type: String, required: true, index: { unique: true }},
    released: {type: Number, required: true},
    genre: {type: String, required: true},
    actors: [{
        actorName: String,
        charName: String
    }],
    imageUrl: { type: String }
});

// return the model to our server
module.exports = mongoose.model('Movie', MovieSchema);