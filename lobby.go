package main

import (
  "encoding/base64"
  "github.com/gin-gonic/gin"
  "github.com/patrickmn/go-cache"
  "math"
)

/******************************************************************************
 * Constants
 *****************************************************************************/

const (
    ScoreMultiplier   float64 = 100
    LobbyIdBytes      int     = 6
    NumberOfQuestions int     = 6
    LobbyMaxPlayers   int     = 4
)

/******************************************************************************
 * Type Declarations
 *****************************************************************************/

type UserAnswers []struct {
    Ra   float64 `json:"ra"`
    Dec  float64 `json:"dec"`
}

type LobbyData struct {
    Status string         `json:"status"`
    Scores map[string]int `json:"scores"`
}

type Lobby struct {
    Data LobbyData
    Host int
    Constellations []Constellation
}

/******************************************************************************
 * Helper functions
 *****************************************************************************/

func getLoggedInUsername(c *gin.Context) (string, int) {
    // get userid of logged in user
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        return "", 0
    }

    // get username from database
    var firstName string
    var lastName  string
    err := stores.sqlPool.QueryRow(
        "SELECT first_name, last_name FROM webapp.user " +
        "WHERE user_id=$1", userId).Scan(&firstName, &lastName)

    if err != nil {
        return "", 0
    }

    // construct full name and return
    return firstName + " " + lastName, userId
}

func getUserScore(questions []Constellation, answers UserAnswers) int {
    if len(answers) > len(questions) {
        // cheat!
        return 0
    }

    score := 0
    for index, value := range answers {
        // if user answer if exact, score 0 -- this is likely cheating
        if value.Ra == questions[index].Ra &&
          value.Dec == questions[index].Dec {
            score += 0
            continue
        }

        // otherwise, do the math
        sDiff := math.Sin(questions[index].Dec) * math.Sin(value.Dec)
        cDiff := math.Cos(questions[index].Dec) * math.Cos(value.Dec)
        cDiff = cDiff * math.Cos(questions[index].Ra - value.Ra)
        distance := math.Acos(sDiff + cDiff)
        score += int(math.Ceil((math.Pi - distance) * ScoreMultiplier))
    }

    return score
}

func lobbyHasEnded(scores map[string]int) bool {
    for _, value := range scores {
        if value < 0 {
            return false
        }
    }

    return true
}


/******************************************************************************
 * Handlers
 *****************************************************************************/

func handleLobbyStatus(c *gin.Context) {
    // check if lobby exists
    lobbyId := c.Param("lobby")
    lobby, found := stores.lobbyStore.Get(lobbyId)
    if !found {
        c.JSON(401, gin.H{"error": "lobby does not exist"})
        return
    }

    // server lobby data struct as JSON
    status := lobby.(*Lobby).Data
    c.JSON(200, status)
}

func handleLobbyCreate(c *gin.Context) {
    // check that user is logged in and get username
    username, userId := getLoggedInUsername(c)
    if userId <= 0 {
        c.JSON(400, gin.H{"error": "user not logged in"})
        return
    }

    // get random id for lobby
    bytes, err := generateRandomId(LobbyIdBytes)
    if err != nil {
        c.JSON(500, gin.H{"error": "unable to create lobby"})
        return
    }
    lobbyId := base64.URLEncoding.EncodeToString(bytes)

    // setup lobby data object
    users := make(map[string]int)
    users[username] = -1
    data := LobbyData{"ready", users}

    // get constellations and setup lobby
    questions := getRandomConstellations(NumberOfQuestions)
    lobby := Lobby{data, userId, questions}

    // store lobby and return
    stores.lobbyStore.Set(lobbyId, &lobby, cache.DefaultExpiration)
    c.JSON(200, gin.H{"message": "lobby created", "id": lobbyId,
                      "questions": questions})
}

func handleLobbyJoin(c *gin.Context) {
    // check that user is logged in and get username
    username, userId := getLoggedInUsername(c)
    if userId <= 0 {
        c.JSON(400, gin.H{"error": "user not logged in"})
        return
    }

    // check if lobby exists
    lobbyId := c.Param("lobby")
    ptr, found := stores.lobbyStore.Get(lobbyId)
    if !found {
        c.JSON(401, gin.H{"error": "lobby does not exist"})
        return
    }
    lobby := ptr.(*Lobby)

    // check that lobby is not full
    if len(lobby.Data.Scores) >= LobbyMaxPlayers {
        c.JSON(401, gin.H{"error": "lobby is full"})
        return
    }

    // check that lobby hasn't already started
    if lobby.Data.Status != "ready" {
        c.JSON(401, gin.H{"error": "lobby has already started"})
        return
    }

    // add user to lobby
    lobby.Data.Scores[username] = -1
    c.JSON(200, gin.H{"message": "added to lobby",
                      "questions": lobby.Constellations})
}

func handleLobbyUserFinished(c *gin.Context) {
    // check that user is logged in and get username
    username, userId := getLoggedInUsername(c)
    if userId <= 0 {
        c.JSON(400, gin.H{"error": "user not logged in"})
        return
    }

    // get user ansers
    var answers UserAnswers
    if c.BindJSON(&answers) != nil {
        c.JSON(401, gin.H{"error": "invalid payload"})
        return
    }

    // check if lobby exists
    lobbyId := c.Param("lobby")
    ptr, found := stores.lobbyStore.Get(lobbyId)
    if !found {
        c.JSON(401, gin.H{"error": "lobby does not exist"})
        return
    }
    lobby := ptr.(*Lobby)

    // check that lobby has already started
    if lobby.Data.Status != "started" {
        c.JSON(401, gin.H{"error": "lobby has not started yet"})
        return
    }

    // check that user is part of lobby
    if _, ok := lobby.Data.Scores[username]; !ok {
        c.JSON(400, gin.H{"error": "you are not a member of this lobby"})
        return
    }

    // calculate and set user score
    score := getUserScore(lobby.Constellations, answers)
    lobby.Data.Scores[username] = score

    // check if status should be set to finished
    if lobbyHasEnded(lobby.Data.Scores) {
        lobby.Data.Status = "ended"
    }

    c.JSON(200, gin.H{"message": "score set"})
}

func handleLobbyStart(c *gin.Context) {
    // get userid of logged in user
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(400, gin.H{"error": "user not logged in"})
    }

    // check if lobby exists
    lobbyId := c.Param("lobby")
    ptr, found := stores.lobbyStore.Get(lobbyId)
    if !found {
        c.JSON(401, gin.H{"error": "lobby does not exist"})
        return
    }
    lobby := ptr.(*Lobby)

    // check that lobby has not already started
    if lobby.Data.Status != "ready" {
        c.JSON(401, gin.H{"error": "lobby has already started"})
        return
    }

    // check that user is the host
    if lobby.Host != userId {
        c.JSON(400, gin.H{"error": "only the host can start the lobby"})
        return
    }

    lobby.Data.Status = "started"
    c.JSON(200, gin.H{"message": "lobby started"})
}

/******************************************************************************
 * Router Group for /lobby/*
 *****************************************************************************/

// setup /lobby routes
func lobbyRoutes(user *gin.RouterGroup) {
    user.GET("/status/:lobby", handleLobbyStatus)

    user.POST("/join/:lobby", handleLobbyJoin)
    user.POST("/start/:lobby", handleLobbyStart)
    user.POST("/create", handleLobbyCreate)
    user.POST("/finish/:lobby", handleLobbyUserFinished)
}
