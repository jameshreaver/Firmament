define(['jquery', 'api', 'event', 'model', 'gui', 'view'], 
function($, FAPI, FEVENT, FMODEL, FGUI, FVIEW) {

  var timeMultiplier     = 1.0;
  var timeUpdateInterval = 32;

  function onSettingsSubmit(event) {
    FMODEL.time      = event.data.date.toDate();
    FMODEL.latitude  = event.data.latitude * (Math.PI / 180);
    FMODEL.longitude = event.data.longitude * (Math.PI / 180);
    event.success();
  }

  function onLoginSubmit(event) {
    FAPI.loginPOST(event.data).success(function(response, status, xhr) {
      FMODEL.refreshUserProfile();
      event.success();
    }).fail(function(response) {
      event.fail(response.responseJSON.error);
    });
  }

  function onRegisterSubmit(event) {
    FAPI.registerPOST(event.data).success(function(response, status, xhr) {
      FMODEL.refreshUserProfile();
      event.success();
    }).fail(function(response) {
      event.fail(response.responseJSON.error);
    });
  }
  
  function onLogoutSubmit(event) {
    FAPI.logoutPOST().success(function() {
      FMODEL.refreshUserProfile();
      event.success();
    }); 
  }

  function onToggleButtonClick(event) {
    FMODEL.toggleVisibility(event.button);
  }
  
  function onPlaceTimeChange(event) {
    FGUI.renderFooterbar();
  }

  function onUserChange(event) {
    FGUI.renderSidebar();
  }

  function onTimeFastbackward(event) {
    if (timeMultiplier >= 256) {
      timeMultiplier = -1;
    } else if (timeMultiplier <= -256) {
      timeMultiplier *= 4;
    } else {
      timeMultiplier = -256;          
    }
  }

  function onTimeFastforward(event) {
    if (timeMultiplier <= -256) {
      timeMultiplier = 1;
    } else if (timeMultiplier >= 256) {
      timeMultiplier *= 4;
    } else {
      timeMultiplier = 256;          
    }
  }

  function onTimePause(event) {
    timeMultiplier = 0;          
  }

  function onTimePlay(event) {
    timeMultiplier = 1;          
  }

  function onSelectFamily(event) {
    FMODEL.setSelectedFamily(event.family);
    FGUI.renderFamilySidebar(event.family);
  }

  function onSelectConstellation(event) {
    FMODEL.setSelectedConstellation(event.constellation);
    FGUI.renderConstellationSidebar(event.constellation, event.group);
  }

  function onQuizNext(event) {
    if (FMODEL.quiz().isFinished()) {
      var result = FMODEL.quiz().done();
      FGUI.renderResultSidebar(result);
    } else {
      FGUI.renderQuizQuestionSidebar();
      FMODEL.setSelectedConstellation(FMODEL.quiz().getCurrentQuestion().correctAnswer);
    }
  }

  function onQuizStart(event) {
    FMODEL.newTest(event.family, event.index);
    FEVENT.fire('quiznext');
  }

  function onQuizAnswer(event) {
		FMODEL.quiz().getCurrentQuestion().answer(event.answer);
		FGUI.renderQuizAnswerSidebar();
		FMODEL.quiz().nextQuestion();
  }

  function onQuizSetup(event) {
    FGUI.prepareLobbyStart();
  }

  function onChallengeFinish(event) {
		FAPI.leaderboardPOST(event.result.correct).then(function() {
      // score submitted, now get leaderboard
      FAPI.leaderboardGET().done(function(data) {
				FGUI.renderLeaderboard(event.result.correct, data);
      });
    });
  }

  function onChallengeStart(event) {
	FMODEL.newChallenge();
    FEVENT.fire('quiznext');
  }

  function onChallengeMultiCreate(event) {
    FMODEL.lobbyCreate();
  }

  function onChallengeLobbyCreated(event) {
    lobbyRefresh();
  }

  function onChallengeLobbyJoin(event) {
    FMODEL.lobbyJoin(event.lobbyId);
  }

  function onChallengeLobbyJoined(event) {
    lobbyRefresh();
  }

  function onChallengeLobbyStart(event) {
    var lobby = FMODEL.lobby();
    if (lobby.host) {
      FAPI.lobbyStartPOST(lobby.lobbyId);
    }
  }

  function onChallengeLobbyStarted(event) {
    // disable labels
    FEVENT.fire('visibilityoff', {objectName: "labels"});
    FGUI.prepareLobbyStart();

    FEVENT.fire('challengelobbynextquestion');
  }

  function onChallengeLobbyNextQuestion(event) {
    var lobby = FMODEL.lobby();
    if (lobby.questions.length > 0) {
      var question = lobby.questions.shift();
      FGUI.renderChallengeLobbyQuestion(question.name, lobby);

      // must wait 2 seconds before next answer
      setTimeout(function() { lobby.awaitingAnswer = true; }, 2000);
    } else {
      FEVENT.fire('challengelobbyansweredall');
    }
  }

  function onChallengeLobbyAnswer(event) {
    // disable enter key listener
    var lobby = FMODEL.lobby();
    lobby.awaitingAnswer = false;

    // store answer
    var answer = FVIEW.getViewCenterPoint();
    lobby.answers.push(answer);

    // get next quetsion
    FEVENT.fire('challengelobbynextquestion');
  }

  function onChallengeLobbyAnsweredAll(event) {
    var lobby = FMODEL.lobby();
    FAPI.lobbyFinishPOST(lobby.lobbyId, lobby.answers).done(function(data) {
      lobbyCompleteCheck();
    });
  }

  function lobbyRefresh() {
    var lobby = FMODEL.lobby();
    FAPI.lobbyStatusGET(lobby.lobbyId).done(function(data) {
      if (data.status == "started") {
        FEVENT.fire('challengelobbystarted');
      } else {
        FGUI.renderLobbyWait(data, lobby.lobbyId, lobby.host);
        setTimeout(lobbyRefresh, 4000);
      }
    });
  }

  function lobbyCompleteCheck() {
    var lobby = FMODEL.lobby();
    FAPI.lobbyStatusGET(lobby.lobbyId).done(function(data) {
      FGUI.renderLobbyResults(data);

      if (data.status != "ended") {
        setTimeout(lobbyCompleteCheck, 4000);
      } else {
        FGUI.cleanupLobbyEnd();   
      }
    });
  }

  function tickUserTime() {
    var t = FMODEL.time;
    var nt = new Date(t.getTime() + timeUpdateInterval * timeMultiplier);
    FMODEL.time = nt;
  }

  return {
    init: function() {
      $(document).ready(function() {
        setInterval(tickUserTime, timeUpdateInterval);

        FEVENT.on('togglebuttonclick', onToggleButtonClick);
        FEVENT.on('placetime',         onPlaceTimeChange);
        FEVENT.on('user',              onUserChange);

        FEVENT.on('timefastbackward', onTimeFastbackward);
        FEVENT.on('timefastforward',  onTimeFastforward);
        FEVENT.on('timepause',        onTimePause);
        FEVENT.on('timeplay',         onTimePlay);

        FEVENT.on('selectfamily',        onSelectFamily);
        FEVENT.on('selectconstellation', onSelectConstellation);

        FEVENT.on('settingssubmit', onSettingsSubmit);
        FEVENT.on('loginsubmit',    onLoginSubmit);
        FEVENT.on('registersubmit', onRegisterSubmit);

        FEVENT.on('logoutsubmit', onLogoutSubmit);

        FEVENT.on('challengestart', onChallengeStart);
        FEVENT.on('challengemulticreate', onChallengeMultiCreate);
        FEVENT.on('challengelobbycreated', onChallengeLobbyCreated);
        FEVENT.on('challengelobbyjoin', onChallengeLobbyJoin);
        FEVENT.on('challengelobbyjoined', onChallengeLobbyJoined);
        FEVENT.on('challengelobbystart', onChallengeLobbyStart);
        FEVENT.on('challengelobbystarted', onChallengeLobbyStarted);
        FEVENT.on('challengelobbynextquestion', onChallengeLobbyNextQuestion);
        FEVENT.on('challengelobbyanswersubmitted', onChallengeLobbyAnswer);
        FEVENT.on('challengelobbyansweredall', onChallengeLobbyAnsweredAll);
        FEVENT.on('quizstart', onQuizStart);
        FEVENT.on('quizanswer', onQuizAnswer);
        FEVENT.on('quiznext', onQuizNext);
        FEVENT.on('quizsetup', onQuizSetup);

        FEVENT.on('challengefinishevent', onChallengeFinish);
      });
    }
  };

});
