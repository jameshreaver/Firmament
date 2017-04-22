// simple node based test server that doesn't require redis or postgres installation
// not to be used in production (obviously)
// only supports 1 user

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

var urlencodedParser = bodyParser.urlencoded({extended: false});

// fake redis/postgres state
var userLoggedIn = false;
var userProgress = [
    {name:"Orion",completed:4,total:5},
    {name:"Zodiacal",completed:0,total:12},
    {name:"Ursa Major",completed:0,total:10},
    {name:"Perseus",completed:0,total:9},
    {name:"Hercules",completed:0,total:20},
    {name:"Bayer",completed:0,total:11},
    {name:"Heavenly Waters",completed:0,total:9},
    {name:"La Caille",completed:0,total:13}
];

var leaderBoard = [
    {name:"Tony Field",score:18},
    {name:"Jane Doe",score:10},
    {name:"Joe Bloggs",score:5},
    {name:"Giacomo Guerci",score:4},
    {name:"Oliver Brown",score:1}
];

app.use(function (req, res, next) {
    var d = new Date();
    console.log(d, req.method, req.path);
    next();
});

app.use('/assets', express.static(__dirname + '/assets'));


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html'); 
});

app.get('/ping', function(req, res) {
    res.json({message: "pong"});
});

app.get('/stars', function(req, res) {
    res.sendFile(__dirname + '/data/stars.json');    
});

app.get('/constellations', function(req, res) {
    res.sendFile(__dirname + '/data/constellations.json');    
});

app.get('/families', function(req, res) {
    res.sendFile(__dirname + '/data/families.json');    
});

app.get('/user/progress/:family', function(req, res) {
    // user id, family name
    var fam = req.params.family;
    userProgress.forEach(function(val) {
        if (val.name === fam) {
            res.json(val.completed);
        }
    });
});

app.get('/user/profile', function(req, res) {
    if (userLoggedIn) {
        res.json({
            loggedIn: true,
            firstName: "Joe",
            lastName: "Bloggs",
            email: "joe@bloggs.com",
            progress: userProgress
        });
    } else {
        res.json({loggedIn: false});
    }
});

app.get('/leaderboard', function(req, res) {
    res.json(leaderBoard);
});


app.post('/user/progress/:family', urlencodedParser, function(req, res) {
    // user id, family name, progress
    var fam = req.params.family;
    var prog = req.body.progress;
    userProgress.forEach(function(val) {
        if (val.name === fam) {
            val.completed = prog;
        }
    });
    res.json({message: "foo"});
});

app.post('/user/register', function(req, res) {
    res.status(400).json({error: "signup not available: test harness"});
});

app.post('/user/login', urlencodedParser, function(req, res) {
    var pw = req.body.password;
    if (pw === 'test') {
        res.status(400).json({error: "email or password incorrect"});
    } else {
        userLoggedIn = true;
        res.json({message: "login successful"});
    }
});

app.post('/user/logout', function(req, res) {
    userLoggedIn = false;
    res.json({message: "logged out"});
});

app.post('/leaderboard', function(req, res) {
    res.json({message: "foo"});
});


var server = app.listen(8080);
