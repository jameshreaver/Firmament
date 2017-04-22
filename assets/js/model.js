define(['jquery', 'api', 'event', 'astro', 'quiz'],
function($, FAPI, FEVENT, ASTRO, FQUIZ) {

  var placeTime = new ASTRO.PlaceTime();

  var stars = {},
      constellations = {},
      families = {};

  var constellationsLoaded = $.Deferred();
  var starsLoaded          = $.Deferred();
  var familiesLoaded       = $.Deferred();

  var profile = {};

  var famProgress  = {};

  var activeQuiz = {};
  var multiLobby = {};

  var activeFamily        = undefined,
      activeConstellation = undefined;
  
  function init() {
    // load data off server
    FAPI.familiesGET().then(function(data) {
      data.forEach(function(v, i) {
        families[v.name] = new ASTRO.Family(v);
      });
    }).done(function() {
      familiesLoaded.resolve(families);
    });

    FAPI.starsGET().then(function(data) {
      data.forEach(function(v, i) {
        stars[v.hid] = new ASTRO.Star(v);
      });
    }).done(function() {
      starsLoaded.resolve(stars);
    });

    FAPI.constellationsGET().then(function(data) {
      data.forEach(function(v, i) {
        constellations[v.name] = new ASTRO.Constellation(v);
      });
    }).done(function() {
      constellationsLoaded.resolve(constellations);
    });
		
		refreshUserProfile();
  }

  function getCelestialSphereRot() {
    return placeTime.celestialSphereRotation();
  }

  function getNumberStars() {
    return Object.keys(stars).length;
  }

  function getFocusAltAz() {
    return {az: focus.az, alt: focus.alt};
  }

  function getSunAltAz() {
    var sunPos = placeTime.sunPosition();
    return sunPos.toAltAz(placeTime);
  }

  function getStar(hid) {
    return stars[hid];
  }

  function getConstellation(name) {
    return constellations[name];
  }

  function getConstellationAltAz(name) {
    var c = getConstellation(name);
    if (typeof c === 'undefined') {
      console.warn("No such constellation: " + name);
      return;
    }
    return new ASTRO.EquatorialPosition(c.ra, c.dec).toAltAz(placeTime);
  }

  function getFamily(name) {
    return families[name]; 
  }

  function getFamilyAltAz(name) {
    var f = getFamily(name);
    if (typeof f === 'undefined') {
      console.warn("No such family: " + name);
      return;
    }
    var groups = f.groups;
    var randomGroup = groups[Math.floor(Math.random() * groups.length)];
    var consts = randomGroup.constellations;
    var randomConst = consts[Math.floor(Math.random() * consts.length)];
    return getConstellationAltAz(randomConst);
  }

  function setSelectedFamily(f) {
    activeFamily = f;
    FEVENT.fire('selectedfamily', {family: f});
  }

  function setSelectedConstellation(c) {
    activeConstellation = c;
    FEVENT.fire('selectedconstellation', {constellation: c});
  }

  function getSelectedFamily(f) {
    return activeFamily;
  }

  function getSelectedConstellation(c) {
    return activeConstellation;
  }

  function eachStar(f) {
    for (var prop in stars) {
      if (stars.hasOwnProperty(prop)) {
        f(stars[prop]); 
      } 
    }
  }

  function eachConstellation(f) {
    for (var prop in constellations) {
      if (constellations.hasOwnProperty(prop)) {
        f(constellations[prop]); 
      } 
    }
  }

  function eachFamily(f) {
    for (var prop in families) {
      if (families.hasOwnProperty(prop)) {
        f(families[prop]); 
      } 
    }
  }

  function refreshUserProfile() {
    FAPI.profileGET().then(function(data) {
      profile = data;
      if (typeof data.progress !== 'undefined') {
        data.progress.forEach(function(v) {
          famProgress[v.name] = v;
        }); 
      }
      FEVENT.fire('user');
    });
  }

  function reloadUserProfile() {
    FAPI.profileGET().then(function(data) {
      profile = data;
      if (typeof data.progress !== 'undefined') {
        data.progress.forEach(function(v) {
          famProgress[v.name] = v;
        }); 
      }
    });
  }

  function isUserLoggedIn() {
    return profile.loggedIn;
  }

  function getUserName() {
    return profile.firstName + " " + profile.lastName;
  }

  function familyProgress(family, value) {
    var fam = famProgress[family];
    if (typeof value !== 'undefined') {
      // only update if further progress
      if (value >= 0 && value <= fam.total) {
        var that = this;
        FAPI.progressPOST(family, value).done(function() {
          reloadUserProfile();
        });
      }
    } else {
      return fam;
    }
  }

  function toggleVisibility(obj) {
    FEVENT.fire('visibility', {objectName: obj});
  }

  function progress() {
    return profile.progress;
  }

  function newTest(family, groupIndex) {
    var quizConf = {
      questions: _buildTestQuestions(family, groupIndex),
      resultCb: function(result) {
        if (result.percent >= 0.70) {
          familyProgress(family, groupIndex + result.total);
        }
      }
    };
    activeQuiz = new FQUIZ.Quiz(quizConf);

    // turn off labels
    FEVENT.fire('visibilityoff', {objectName: "labels"});
    FEVENT.fire('quizsetup');
  }

  function newChallenge() {
    var quizConf = {
			timeLimit: 60,
      questions: _buildChallengeQuestions(),
      resultCb: function(result) {
        FEVENT.fire('challengefinishevent', {result: result});
      }
    };
    activeQuiz = new FQUIZ.Quiz(quizConf);

    // turn off labels
    FEVENT.fire('visibilityoff', {objectName: "labels"});
    FEVENT.fire('quizsetup');
  }

  function _buildChallengeQuestions() {
    var questions = [];
    var defaultQuestion = "What is the name of this constellation?";

    var allNames = Object.keys(constellations);
    for (var i = 0, ii = allNames.length; i < ii; i++) {
      questions.push(new FQUIZ.Question(defaultQuestion, allNames[i]));
    }

    return questions;
  }

  function _buildTestQuestions(family, targetGroup) {
    // questions that will definitely be asked
    var questions = [];
    var defaultQuestion = "What is the name of this constellation?";

    var data = getFamily(family);
    // take ALL questions from current group
    data.groups[targetGroup].constellations.forEach(function(constellation) {
      questions.push(new FQUIZ.Question(defaultQuestion, constellation));
    });

    for (var i = 0, ii = this.group; i < ii; i++) {
      var group = data.groups[i];
      var gConstellations = group.constellations;
      for (var j = 0, jj = gConstellations.length; j < jj; j++) {
        // 50-50 chance of being included
        if (Math.random() > 0.50) {
          questions.push(new FQUIZ.Question(defaultQuestion, gConstellations[j]));
        }
      }
    }

    return questions;
  }

  function quiz() {
    return activeQuiz;
  }

  function lobby() {
    return multiLobby;
  }

  function lobbyCreate() {
    FAPI.lobbyCreatePOST().done(function(data) {
      multiLobby.lobbyId = data.id;
      multiLobby.questions = data.questions;
      multiLobby.answers = [];
      multiLobby.status = "ready";
      multiLobby.host = true;
      FEVENT.fire('challengelobbycreated');
    });
  }

  function lobbyJoin(lobbyId) {
    FAPI.lobbyJoinPOST(lobbyId).done(function(data) {
      multiLobby.lobbyId = lobbyId;
      multiLobby.questions = data.questions;
      multiLobby.answers = [];
      multiLobby.status = "ready";
      multiLobby.host = false;
      FEVENT.fire('challengelobbyjoined');
    });
  }

  return {
    init: init,
    constellationsLoaded: constellationsLoaded,
    starsLoaded: starsLoaded,
    familiesLoaded: familiesLoaded,

    getCelestialSphereRot: getCelestialSphereRot,
    getNumberStars: getNumberStars,
    getSunAltAz: getSunAltAz,
    getFocusAltAz: getFocusAltAz,
    getStar: getStar,

    getConstellation: getConstellation,
    getConstellationAltAz: getConstellationAltAz,

    getFamily: getFamily,
    getFamilyAltAz: getFamilyAltAz,

    getSelectedConstellation: getSelectedConstellation,
    getSelectedFamily: getSelectedFamily,
    setSelectedConstellation: setSelectedConstellation,
    setSelectedFamily: setSelectedFamily,

    toggleVisibility: toggleVisibility,

    eachStar: eachStar,
    eachConstellation: eachConstellation,
    eachFamily: eachFamily,

    refreshUserProfile: refreshUserProfile,
    reloadUserProfile: reloadUserProfile,

    isUserLoggedIn: isUserLoggedIn,
    getUserName: getUserName,

    progress: progress,
    familyProgress: familyProgress,

    newTest: newTest,
    newChallenge: newChallenge,
    quiz: quiz,
    lobby: lobby,
    lobbyCreate: lobbyCreate,
    lobbyJoin: lobbyJoin,

    get quizFamily() {
      return quizFamily;
    },
    get quizGroup() {
      return quizGroup;
    },

    get latitude() {
      return placeTime.latitude;
    },
    set latitude(latitude) {
      placeTime.latitude = latitude;
      FEVENT.fire('placetime');
    },
    get longitude() {
      return placeTime.longitude;
    },
    set longitude(longitude) {
      placeTime.longitude = longitude;
      FEVENT.fire('placetime');
    },
    get time() {
      return placeTime.date;
    },
    set time(time) {
      placeTime.date = time;
      FEVENT.fire('placetime');
    }
  };
});
