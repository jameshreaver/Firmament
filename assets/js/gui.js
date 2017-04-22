define(['jquery', 'event', 'model', 'moment', 'mustache', 'bootstrap'],
function($, FEVENT, FMODEL, Moment, Mustache) {

  function init() {

    // only show welcome once
    var welcomeSeen = false;

    $(document).ready(function() {
      // rotate the sceen until user is ready to begin
      $("#start-button").on("click", function() {
        $("#gui").fadeIn();
        $(".site-wrapper").fadeOut();
        if (!welcomeSeen) {
          $("#instructions").modal("show");
          welcomeSeen = true;
        }
        return false;
      });

      $('a[href*="#signup"]').click(function() {
        $(".modal.in").modal("hide");
        $("#gui").fadeIn();
        $(".site-wrapper").fadeOut(); 
        $("#signup").modal("show");
        return false;
      });
      $('a[href*="#login"]').click(function() {
        $(".modal.in").modal("hide");
        $("#gui").fadeIn();
        $(".site-wrapper").fadeOut(); 
        $("#login").modal("show");
        return false;
      });
      $('a[href*="#skyset"]').click(function() {
        $(".modal.in").modal("hide");
        $("#skyset").modal("show");
        return false;
      });

      $("#sidebar-button").click(function() {
        $("#sidebar").fadeToggle();
        return false;
      });
      
      $('a[href*="#instructions"]').click(function() {
        $(".modal.in").modal("hide");
        $("#instructions").modal("show");
        return false;
      });
      
      $('a[href*="#about"]').click(function() {
        $("#gui").fadeIn();
        $(".site-wrapper").fadeOut(); 
        $(".modal.in").modal("hide");
        $("#about").modal("show");
        return false;
      });

      $(".setting-icon").click(function() {
        $(this).toggleClass("setting-icon-on");
        return false;
      });

      $('.fa-pause').click(function () {
        FEVENT.fire("timepause");
        return false;
      });
      $('.fa-fast-backward').click(function () {
        FEVENT.fire("timefastbackward");
        return false;
      });
      $('.fa-play').click(function () {
        FEVENT.fire("timeplay");
        return false;
      });
      $('.fa-fast-forward').click(function () {
        FEVENT.fire("timefastforward");
        return false;
      });

      $("#leaderboard").on("click", ".btn", function() {
		$("#leaderboard").fadeOut();
        renderSidebar();
      });

      // events that the rest of the app need to be notifed about
      $(".setting-icon").click(function() {
        var setting = $(this).data("toggle"); 
        FEVENT.fire('togglebuttonclick', {button: setting});
      }); 
 
      $("#sidebar").on("click", "[data-constellation]", function() {
        var constellation = $(this).data("constellation");
        var group         = $(this).data("group");
        FEVENT.fire('selectconstellation', {constellation: constellation, group: group});
      });

      $("#sidebar").on("click", "[data-family]", function() {
        var family = $(this).data("family");
        FEVENT.fire('selectfamily', {family: family}); 
      });

      $("#sidebar").on("click", "[data-test]", function() {
        var quizConf = {
          family: $(this).data("family"),
          index:  $(this).data("group"),
          challenge: false
        };
        FEVENT.fire('quizstart', quizConf);
      });

      $("#sidebar").on("click", "[data-quiz-submit]", function() {
        FEVENT.fire('quizanswer', {answer: $("#quiz-answer-box").val()});
      });

      $("#sidebar").on("click", "[data-quiz-next]", function() {
        FEVENT.fire('quiznext');
      });

      $("#sidebar").on("click", "[data-reset]", function() {
        if (typeof FMODEL.quiz().getTimeInterval != "undefined") {
          clearInterval(FMODEL.quiz().getTimeInterval());
        }
        FEVENT.fire('clearhighlight');
        cleanupLobbyEnd();
        renderSidebar();
      });

      $("#lobby-wait").on("click", "[data-start]", function() {
        FEVENT.fire('challengelobbystart');
      });

      $("#lobby-wait").on("click", "[data-end]", function() {
        $("#lobby-wait").hide();
        cleanupLobbyEnd();
        renderSidebar();
      });

      $("#challenge-mode").click(function() {
        $(".modal.in").modal("hide");
        $("#challenge-select").modal("show");
        return false; 
      });

      $("#challenge-mode-single").click(function() {
        FEVENT.fire('challengestart');
      });

      $("#multiplayer-create").click(function() {
        FEVENT.fire('challengemulticreate');
      });

      $('#skyset').on('show.bs.modal', function() {
        $("#longitude-input").val(FMODEL.longitude * (180 / Math.PI));
        $("#latitude-input").val(FMODEL.latitude * (180 / Math.PI));
        $("#datetime-input").val(new Moment(FMODEL.time).format("YYYY-MM-DD HH:mm"));
      });

      $("#settings-form").submit(function(event) {
        event.preventDefault();

        var error = function(message) {
          $("#settings-error").html('<p>' + message + '</p>').show();
        };

        var latInput      = $("#latitude-input").val();
        var longInput     = $("#longitude-input").val();
        var dateTimeInput = $("#datetime-input").val();

        var date      = new Moment(dateTimeInput, "YYYY-MM-DD HH:mm");
        var latitude  = parseFloat(latInput);
        var longitude = parseFloat(longInput);

        if (!date.isValid()) {
          error("Invalid date");
        } else if (latitude > 90 || latitude < -90) {
          error("Invalid latitude");
        } else if (longitude > 180 || latitude < -180) {
          error("Invalid longitude");
        } else {
          var event = {
            data: {date: date, latitude: latitude, longitude: longitude},
            success: function() {
              $("#skyset").modal("hide");
              $("#settings-error").empty().hide();
            },
            fail: error
          };
          FEVENT.fire('settingssubmit', event);
        }
      });

      $("#signup-form").submit(function() {
        event.preventDefault();
        var evt = {
          data: $(this).serialize(),
          success: function() {
            $("#signup-error").empty().hide();
            $("#signup-form")[0].reset();
          },
          fail: function(reason) {
            $("#signup-error").html('<p>' + reason + '</p>').show();
          }
        };
        FEVENT.fire('registersubmit', evt);
      });

      $("#login-form").submit(function() {
        event.preventDefault();
        var evt = {
          data: $(this).serialize(),
          success: function() {
            $("#sidebar-button").removeClass("disabled");
            $("#login").modal("hide");
            $("#login-error").empty().hide();
            $("#login-form")[0].reset();
          },
          fail: function(reason) {
            $("#login-error").html('<p>' + reason + '</p>').show();
          }
        };
        FEVENT.fire('loginsubmit', evt);
      });

      $("#user-logout").click(function() {
        event.preventDefault();
        var evt = {
          success: function() {
            $("#sidebar-button").addClass("disabled");
          }
        };
        FEVENT.fire('logoutsubmit', evt);
      });
    });
  }

  function getJoinId() {
    var hash = window.location.hash;
    if (hash.length == 16 && hash.substring(0, 8) == "#!/join/") {
      return hash.substring(8, 16);
    }
    return "";
  }

  function renderSidebar() {
    // clear all old elements from sidebar
    $("#sidebar").empty();
    var joinId = getJoinId();

    // check if logged in
    if (FMODEL.isUserLoggedIn()) { 
      if (joinId.length) {
        $("#gui").fadeIn();
        $(".site-wrapper").fadeOut(); 

        FEVENT.fire('challengelobbyjoin', {lobbyId: joinId});
      } else {
        renderSidebarWelcome();
        $("#start-button").trigger("click");
        $("#sidebar-button").removeClass("disabled");
        $("#sidebar").fadeIn(600);
      }
 
      $("#user-name").html(FMODEL.getUserName());

      // show sidebar automatically when logged in
      $("#signin").hide();
      $("#user-block").show();
    } else {
      $("#signin").show();
      $("#user-block").hide();
      $("#sidebar").fadeOut(600);

      if (joinId.length) {
        $("#login").trigger("click");
      }
    }
  }

  function renderFooterbar() {
    var date = new Moment(FMODEL.time);
    var lat  = FMODEL.latitude;
    var lon  = FMODEL.longitude;

    $("#time").html(date.format("h:mm:ss a"));
    $("#date").html(date.format("dddd, MMMM Do YYYY"));
    $("#datetime").html(date.format("DD/MM/YY, h:mm:ss a"));

    var lat3dp  = Math.abs(lat * (180 / Math.PI)).toFixed(3);
    var long3dp = Math.abs(lon * (180 / Math.PI)).toFixed(3);
    var latfmt  = lat < 0 ? lat3dp + "&deg;S" : lat3dp + "&deg;N";
    var longfmt = lon < 0 ? long3dp + "&deg;W" : long3dp + "&deg;E";
    $("#location").html(latfmt + ", " + longfmt);
  }

  function renderSidebarWelcome() {
    var data = {
      family: FMODEL.progress()
    };

    var template = $("#families").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }

  function renderFamilySidebar(family) {
    var data = {
      prog: FMODEL.familyProgress(family),
      groups: []
    };

    var groups = FMODEL.getFamily(family).groups;
    for (var i = 0, ii = groups.length; i < ii; i++) {
      data.groups.push({index: i, constellations: groups[i].constellations});
    }

    var template = $("#family").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }

  function renderConstellationSidebar(constellation, groupIndex) {
    var constData = FMODEL.getConstellation(constellation);
    var famData   = FMODEL.getFamily(constData.family);
    var groupData = famData.groups[groupIndex];

    var i = groupData.constellations.indexOf(constellation);
    var data = {};
    
    data.current = constData;
    data.family  = constData.family;
    data.test    = {index: groupIndex, name: constData.family};
    if (i + 1 < groupData.constellations.length) {
      data.next = {index: groupIndex, name: groupData.constellations[i + 1]};
    }
    if (i > 0) {
      data.prev = {index: groupIndex, name: groupData.constellations[i - 1]}  
    }

    var template = $("#constellation").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }
    
  function renderQuizQuestionSidebar() {
    var quizQuestion = FMODEL.quiz().getCurrentQuestion();
    var data = {
      question: quizQuestion.question,
      time:     FMODEL.quiz().getTimeRemaining()
    };
    var template = $("#quiz-question").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }

  function renderQuizAnswerSidebar() {
    var quizQuestion = FMODEL.quiz().getCurrentQuestion();
    var data = {
      correct: quizQuestion.answeredCorrectly,
      name:    quizQuestion.correctAnswer,
      time:    FMODEL.quiz().getTimeRemaining()
    };
    var template = $("#quiz-answer").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }

  function renderResultSidebar(result) {
    var data = {
      correct: result.correct,
      total:   result.total,
      pass:    result.pass
    };
    var template = $("#quiz-result").html();
    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
  }

  function renderLobbyWait(lobby, lobbyId, host) {
    var template = $("#lobby-start").html();
    var players = [];

    $.each(lobby.scores, function(k, v) {
      players.push({player: k, status: "ready"});
    });

    var data = {
      person: players,
      lobbyId: lobbyId,
      host: host
    };

    var html = Mustache.to_html(template, data);
    $("#sidebar").hide();
    $("#lobby-wait").html(html);
    $("#lobby-wait:hidden").fadeIn();
  }

  function renderLobbyResults(lobby) {
    var template = $("#lobby-results").html();
    var players = [];

    $.each(lobby.scores, function(k, v) {
      if (v < 0) {
        players.push({player: k, score: "still playing..."});
      } else {
        players.push({player: k, score: v});
      }
    });

    var data = {
      person: players
    };

    var html = Mustache.to_html(template, data);
    $("#sidebar, #crosshair").hide();
    $("#lobby-wait").html(html);
    $("#lobby-wait:hidden").fadeIn();
  }

  function prepareLobbyStart() {
    $("[data-toggle='labels']").addClass('disabled')
                               .removeClass('setting-icon-on');
    $("#lobby-wait").hide();
  }

  function cleanupLobbyEnd() {
    $("[data-toggle='labels']").removeClass('disabled');
  }

  function renderChallengeLobbyQuestion(question, lobby) {
    var template = $("#multiplayer-question").html();
    var data = {
      constName: question
    }

    var html = Mustache.to_html(template, data);
    $("#sidebar").html(html);
    $("#sidebar:hidden, #crosshair:hidden").fadeIn();

    // setup enter key to submit
    $(document).keypress(function(e) {
      if(e.which == 13 && lobby.awaitingAnswer) {
        FEVENT.fire('challengelobbyanswersubmitted');
      }
    });
  }

  function renderLeaderboard(myScore, leaders) {
    var template = $("#leader").html();
    var toPerson = function(leader, idx) {
	  return {
		rank: idx,
		score: leader.score * 100,
		name: leader.name
      };
    };

    var data = {
      person: leaders.map(toPerson),
      score:  myScore * 100
	};
	
    var html = Mustache.to_html(template, data);
    $("#sidebar").hide();
    $("#leaderboard").html(html);
    $("#leaderboard").fadeIn();
  }

  return {
    init: init,

    renderSidebar:              renderSidebar,
    renderSidebarWelcome:       renderSidebarWelcome,
    renderConstellationSidebar: renderConstellationSidebar,
    renderFamilySidebar:        renderFamilySidebar,
    renderFooterbar:            renderFooterbar,

    renderQuizAnswerSidebar:    renderQuizAnswerSidebar,
    renderQuizQuestionSidebar:  renderQuizQuestionSidebar,
    renderResultSidebar:        renderResultSidebar,

    renderLobbyWait: renderLobbyWait,
    prepareLobbyStart: prepareLobbyStart,
    cleanupLobbyEnd: cleanupLobbyEnd,
    renderChallengeLobbyQuestion: renderChallengeLobbyQuestion,
    renderLobbyResults: renderLobbyResults,

    renderLeaderboard: renderLeaderboard
  };
});
