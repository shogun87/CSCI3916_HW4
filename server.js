/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
// var http = require('http');
var bodyParser = require('body-parser');
var passport = require('passport');
// var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors()); // allowing browser to call
app.use(bodyParser.json()); // using a json parser, so we don't have to do json.parse all the time
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router(); // so we can use get requests

// function getJSONObjectForMovieRequirement(req) {
//     var json = {
//         headers: "No headers",
//         key: process.env.UNIQUE_KEY,
//         body: "No body",
//         message: "",            // added message parameter to send back in response
//         query: ""               // added query parameter to send back queries in response
//     };
//
//     if (req.body != null) {
//         json.body = req.body;
//     }
//
//     if (req.headers != null) {
//         json.headers = req.headers;
//     }
//
//     return json;
// }

router.post('/signup', function(req, res) {
    // if no username or password then return failure with message
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else { // else create new user
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code === 11000)
                    return res.status(400).json({success: false, message: 'A user with that username already exists'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err) {
            res.send(err);
        }
        // added extra logic to catch if user isn't in the database
        else if(!userNew.username || !userNew.password || !user) {
            res.json({success: false, message: "User not found in database." })
        }
        else {
            user.comparePassword(userNew.password, function (isMatch) {
                if (isMatch) {
                    var userToken = {id: user.id, username: user.username};
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({success: true, token: 'JWT ' + token});
                } else {
                    res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        }
    });
});

// Movie route with parameters
router.route('/movies/*')
    // GET functionality with /movies/:movieparameters
    .get(authJwtController.isAuthenticated, function(req, res) {
        // use findOne to find movie based on request parameter
        Movie.findOne({ title: req.params[0] }, function(err, movie) {
            if(err){
                res.send(err);
            }
            else if(!movie) {
                res.status(400).json({success: false, message: "Movie not found in database." })
            }
            else{
                res.status(200).json(movie)
            }
        })
    })

    // PUT functionality
    .put(authJwtController.isAuthenticated, function(req, res) {
        // find entry based on parameter and update it based on the request body
        Movie.findOneAndUpdate({ title: req.params['0'] },  req.body , { new: true },
            function(err) {
            if(err) {
                res.status(400).json({ success: false, message: "Failed the update movie." })
            }
            else {
                res.status(200).json({ success: true, message: "Successfully updated movie." })
            }
        })
    })

    // DELETE functionality
    .delete(authJwtController.isAuthenticated, function(req, res) {
        // remove movie based on request parameter movie title
        Movie.remove({ title: req.params['0'] }, (err) => {
            if(err){
                return res.status(400).json({ success: false, message: "Failed to delete movie from database."})
            }
            else {
                return res.status(200).json({ success: true, message: "Movie was deleted from database."})
            }
        })
    });

// Movie route
router.route('/movies')
    // GET functionality
    .get(authJwtController.isAuthenticated, function(req, res) {
        // find and return all movies in the database
        Movie.find({}, function(err, movies){
            if(err){
                return res.status(401).json({success: false, message: "Failed to get Movies from database."})
            }
            else{
                // Check if user wanted movie reviews
                if(req.query.reviews === "true") {
                    // Aggregate the reviews into the movie data
                    Movie.aggregate([
                        {
                            $lookup:
                                {
                                    from: "reviews",   // From db on mongodb
                                    localField: "title",  // Local field from movies schema
                                    foreignField: "movieId", // Foreign field is from reviews schema
                                    as: "movie_review"   // This is what the name of the new aggregated field will be
                                }
                        },
                        {
                            // Add a new field on the response, avg_rating that will have the avg rating for reviews on that movie
                            $addFields:
                            {
                                avg_rating: {$avg: "$movie_review.rating"}
                            }
                        }
                    ]).exec(function(err, movie_review) { // Need to execute the aggregation
                        if(err){
                            res.status(500).json({success: false, message: "Failed to aggregate reviews"});
                        }
                        else {
                            return res.status(200).json(movie_review)
                        }
                    })
                }
                else {
                    return res.status(200).json(movies);
                }
            }
        })
    })

    // POST functionality
    .post(authJwtController.isAuthenticated, function(req, res) {
        // make sure the user input has all required entries for a new movie
        if (!req.body.title || !req.body.released || !req.body.genre || req.body.actors.length < 3) {
            res.status(400).json({success: false, msg: "Please include 'title', 'year released', 'genre', and at least 3 actors."})
        } else { // else create new movie
            var movie = new Movie();
            movie.title = req.body.title;
            movie.released = req.body.released;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;

            // save the new movie
            movie.save(function(err) {
                if(err) {
                    return res.status(409).json({success: false, message: "Movie already in database."});
                }
                else {
                    return res.status(200).json({success: true, message: "Successfully added movie to database."})
                }
            })
        }
    });

    // // PUT functionality
    // .put(authJwtController.isAuthenticated, function(req, res) {
    //     console.log(req.body);
    //     res = res.status(200);          // return status of 200
    //     if (req.get('Content-Type')) {
    //         res = res.type(req.get('Content-Type'));
    //     }
    //     var o = getJSONObjectForMovieRequirement(req);  // create json object
    //     o.message = "movie updated"     // change the json message
    //     o.query = req.query;            // change the json query info to user query, if there was one
    //     res.json(o);
    // })

    // // DELETE functionality
    // .delete(authJwtController.isAuthenticated, function(req, res) {
    //     Movie.remove({ title: req.body.title }, (err) => {
    //         if(err){
    //             return res.json({ success: false, message: "Failed to delete movie from database."})
    //         }
    //         else {
    //             return res.json({ success: true, message: "Movie was deleted from database."})
    //         }
    //     })
    // });

router.route("/reviews")
    // GET functionality
    .get(authJwtController.isAuthenticated, function(req, res) {
        // Find all reviews and send them back to user
        Review.find({}, function(err, reviews) {
            if(err){
                return res.status(401).json({success: false, message: "Failed to get Reviews from database."})
            }
            else{
                return res.status(200).json(reviews);
            }
        })
    })

    // POST functionality
    .post(authJwtController.isAuthenticated, function(req, res) {
        // Make sure the user input all required fields for review
        if(!req.body.movieId || !req.body.review || !req.body.rating){
            res.status(400).json({success: false, message: "Please include 'Movie title', 'Your review', and 'Your rating'"})
        } else { // Else add review to database
            var review = new Review();
            review.movieId = req.body.movieId;
            review.reviewerId = req.user.username;
            review.review = req.body.review;
            review.rating = req.body.rating;
        }

        // Save review to database
        review.save(function(err) {
            if(err) {
                return res.status(409).json({success: false, message: "Review wasn't saved to database"})
            }
        })
    });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


