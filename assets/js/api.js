define(['jquery'],
function($) {
  const urls = {
    ping:           "ping",

    stars:          "stars",
    constellations: "constellations",
    families:       "families",

    profile:        "user/profile",
    progress:       "user/progress",
    login:          "user/login",
    logout:         "user/logout",
    register:       "user/register",
    leaderboard:    "leaderboard",

    lobbyStatus:    "lobby/status",
    lobbyStart:     "lobby/start",
    lobbyJoin:      "lobby/join",
    lobbyCreate:    "lobby/create",
    lobbyFinish:    "lobby/finish"
  };

  return {
    starsGET: () => { return $.getJSON(urls.stars); },
    constellationsGET: () => { return $.getJSON(urls.constellations); },
    familiesGET: () => { return $.getJSON(urls.families); },
    profileGET: () => { return $.getJSON(urls.profile); },
    leaderboardGET: () => { return $.getJSON(urls.leaderboard); },

    progressPOST: (family, value) => { return $.post(urls.progress + "/" + family, {progress: value}); },
    loginPOST: (data) => { return $.post(urls.login, data); },
    logoutPOST: (data) => { return $.post(urls.logout, data); },
    registerPOST: (data) => { return $.post(urls.register, data); },
    leaderboardPOST: (data) => { return $.post(urls.leaderboard, {score: score}); },

    lobbyStatusGET: (lobbyId) => { return $.getJSON(urls.lobbyStatus + "/" + lobbyId); },
    lobbyStartPOST: (lobbyId) => { return $.post(urls.lobbyStart + "/" + lobbyId); },
    lobbyJoinPOST: (lobbyId) => { return $.post(urls.lobbyJoin + "/" + lobbyId); },
    lobbyCreatePOST: () => { return $.post(urls.lobbyCreate); },
    lobbyFinishPOST: (lobbyId, answers) => {
      const payload = JSON.stringify(answers);
      return $.post(urls.lobbyFinish + "/" + lobbyId, payload);
    }
  };
});
