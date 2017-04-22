package main

import (
  "strconv"
  "github.com/gin-gonic/gin"
  "github.com/garyburd/redigo/redis"
)

/******************************************************************************
 * Type Declarations
 *****************************************************************************/

type LeaderboardEntries []struct {
    Name  string `json:"name"`
    Score uint64 `json:"score"`
}

/******************************************************************************
 * Helper functions
 *****************************************************************************/

// adds entry to the leaderboard, will remove leaderboard entires out of top 10
func insertLeaderboardEntry(userId int, score uint64) error {
    var firstName string
    var lastName string
    err := stores.sqlPool.QueryRow(
        "SELECT first_name, last_name FROM webapp.user " +
        "WHERE user_id=$1", userId).Scan(&firstName, &lastName)

    // check if user actually exists in database
    if err != nil {
        return err
    }

    // we have their name and score, add to leaderboard
    con := stores.redisPool.Get()
    defer con.Close()
   
    name := firstName + " " + lastName
    _, err = con.Do("ZADD", "leaderboard", score, name)
    if err != nil {
        return err
    }

    // delete entries from leaderboard that aren't in the top 10
    con.Do("ZREMRANGEBYRANK", "leaderboard", 0, -11)
    return nil
}



/******************************************************************************
 * Handlers
 *****************************************************************************/

func handleGetLeaderboard(c *gin.Context) {
    // get redis connection
    con := stores.redisPool.Get()
    defer con.Close()

    // get top 10 leaderboard entries
    values, err := redis.Values(
                     con.Do("ZREVRANGE", "leaderboard", 0, 9, "WITHSCORES"))
    if err != nil {
        c.JSON(400, gin.H{"error": "leaderboard went away"})
        return
    }

    var entries = LeaderboardEntries{}
    if err := redis.ScanSlice(values, &entries); err != nil {
        c.JSON(400, gin.H{"error": "leaderboard went away"})
        return
    }

    c.JSON(200, entries)
}

func handleAddToLeaderboard(c *gin.Context) {
    // get userid of logged in user, abort if 0
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(401, gin.H{"error": "not logged in"})
        return
    }

    // get the score field from the request, and convert to uint
    score, err := strconv.ParseUint(c.PostForm("score"), 10, 64)
    if err != nil || score <= 0 || score > 88 {
        c.JSON(400, gin.H{"error": "invalid score value"})
        return
    }

    // get user name and add to leaderboard
    err = insertLeaderboardEntry(userId, score)
    if err != nil {
      c.JSON(500, gin.H{"error": "failed to add entry to leaderboard"})
      return
    }


    c.JSON(200, gin.H{"message": "score has been added to leaderboard"})
}

/******************************************************************************
 * Router Group for /leaderboard*
 *****************************************************************************/

// setup /leaderboard routes
func leaderboardRoutes(user *gin.RouterGroup) {
    user.GET("", handleGetLeaderboard)
    user.POST("", handleAddToLeaderboard)
}
