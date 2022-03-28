var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

// user schema
var UserSchema = new Schema({
    name: String,
    username: { type: String, required: true, index: { unique: true }},
    password: { type: String, required: true, select: false }
});

UserSchema.pre('save', function(next) {
    var user = this;

    // hash the password
    if (!user.isModified('password')) return(next);

    bcrypt.hash(user.password, null, null,function(err, hash) {
        if (err) return next(err);

        // change the password
        user.password = hash;
        next();
    });
});

UserSchema.methods.comparePassword = function (password, callback) {
    var user = this;

    bcrypt.compare(password, user.password, function (err, isMatch) {
        callback(isMatch);
    })
}

// return the model to our server
module.exports = mongoose.model('User', UserSchema);