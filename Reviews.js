var mongoose = require('mongoose');
var Schema = mongoose.Schema;


mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

// user schema
var ReviewSchema = new Schema({
    movieId: {type: String, required: true},
    reviewerId: {type: String, required: true},
    review: {type: String, required: true},
    rating: {type: Number, required: true}
});

// return the model to our server
module.exports = mongoose.model('Review', ReviewSchema);