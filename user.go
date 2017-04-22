package main

import (
  "time"
  "strconv"
  "net/http"
  "crypto/rand"
  "crypto/sha256"
  "encoding/base64"
  "regexp"
  "github.com/gin-gonic/gin"
  "github.com/garyburd/redigo/redis"
  "golang.org/x/crypto/bcrypt"
)

/******************************************************************************
 * Constants
 *****************************************************************************/

const (
    SessionCookieName string        = "FIRMAMENT_SESSION"
    SessionMaxLength  time.Duration = time.Hour * 24
    SessionTokenBytes int           = 32
    EmailAddrRegex    string        = ".+\\@(?:[^\\.]+\\.)+[^\\.]+"
    BcryptCostFactor  int           = 12
)

/******************************************************************************
 * Type Declarations
 *****************************************************************************/

type FamilyProgress struct {
    Name      string `json:"name"`
    Completed uint64 `json:"completed"`
    Total     uint64 `json:"total"`
}

type Profile struct {
    LoggedIn  bool             `json:"loggedIn"`
    FirstName string           `json:"firstName"`
    LastName  string           `json:"lastName"`
    Email     string           `json:"email"`
    Progress  []FamilyProgress `json:"progress"`
}

/******************************************************************************
 * Helper functions
 *****************************************************************************/

// generate a random token of length bytes
func generateRandomId(bytes int) ([]byte, error) {
    b := make([]byte, bytes)
    _, err := rand.Read(b)
    if err != nil {
        return []byte{}, err
    }

    // return bytes
    return b, nil
}

// return the userid and session token of the logged in user, 0 otherwise.
func getLoggedInUser(c *gin.Context) (int, string) {
    // get cookie
    val, err := c.Request.Cookie(SessionCookieName)
    if err != nil {
        return 0, ""
    }
    
    // search for session
    con := stores.redisPool.Get()
    defer con.Close()

    // base64 decode session id
    bytes, err := base64.URLEncoding.DecodeString(val.Value)
    if err != nil {
        return 0, ""
    }

    // sha256 hash of session id for lookup
    shaSum := sha256.Sum256(bytes)
    sessionHash := base64.URLEncoding.EncodeToString(shaSum[:])

    userId, err := redis.Int(con.Do("GET", "session:" + sessionHash))
    if err != nil {
        return 0, val.Value
    }

    // return the logged in userid
    return userId, val.Value
}

// create a new session for the user and set the session cookie on the response
func createUserSession(c *gin.Context, userId int) bool {
    // get a new session id
    bytes, err := generateRandomId(SessionTokenBytes)
    if err != nil {
        return false
    }

    // setup session in redis
    con := stores.redisPool.Get()
    defer con.Close()

    // get session length
    ttl := int(SessionMaxLength.Seconds())

    // hash session id for storage (sha256 - no need for bcrypt here)
    shaSum := sha256.Sum256(bytes)
    sessionHash := base64.URLEncoding.EncodeToString(shaSum[:])

    // set session token to user id
    con.Send("MULTI")
    con.Send("SETNX", "session:" + sessionHash, userId)
    con.Send("EXPIRE", "session:" + sessionHash, ttl)
    r, err := redis.Ints(con.Do("EXEC"))
    if err != nil || r[0] == 0 || r[1] == 0 {
        con.Do("DEL", "session:" + sessionHash)
        return false
    }

    // base64 encode session id for cookie
    token := base64.URLEncoding.EncodeToString(bytes)

    // send session to user
    http.SetCookie(c.Writer, createSessionCookie(token, 0))
    return true
}

// returns a configured cookie object for sessions
func createSessionCookie(token string, maxAge int) *http.Cookie {
    cookie := http.Cookie{}
    cookie.Name = SessionCookieName
    cookie.Value = token
    cookie.Path = "/"
    cookie.MaxAge = maxAge
    cookie.Secure = true
    cookie.HttpOnly = true
    return &cookie
}

// updates the progress for named family
func setUserProgress(userId int, familyName string, newVal uint64) (bool, error) {
    con := stores.redisPool.Get()
    defer con.Close()
   
    // check if familyName is valid
    if max, ok := familySize[familyName]; newVal < 0 || newVal > max || !ok {
        return false, nil
    }

    // set new value
    key := "progress:" + strconv.Itoa(userId) + ":" + familyName
    _, err := con.Do("SET", key, newVal)
    if err != nil {
        return true, err
    }

    return true, nil
}

// return FamilyProgress containing user progress for named family
func getUserProgress(userId int, familyName string) (FamilyProgress, error) {
    con := stores.redisPool.Get()
    defer con.Close()
    
    key := "progress:" + strconv.Itoa(userId) + ":" + familyName
    exists, err := redis.Int(con.Do("EXISTS", key))
    if err != nil {
        return FamilyProgress{}, err
    }

    var value uint64 = 0
    if exists == 1 {
        value, err = redis.Uint64(con.Do("GET", key))
        if err != nil {
            return FamilyProgress{}, err
        }
    }

    return FamilyProgress{familyName, value, familySize[familyName]}, nil
}

// retuns FamilyProgress array containing user progress for all families
func getTotalUserProgress(userId int) ([]FamilyProgress, error) {
    progress := make([]FamilyProgress, 0)
    for _, family := range families {
        familyProgress, err := getUserProgress(userId, family.Name)
        if err != nil {
            return nil, err
        }
        
        progress = append(progress, familyProgress)
    }

    return progress, nil
}

/******************************************************************************
 * Handlers
 *****************************************************************************/

func handleRegistration(c *gin.Context) {
    firstName := c.PostForm("first_name")
    lastName  := c.PostForm("last_name")
    emailAddr := c.PostForm("email")
    password  := c.PostForm("password")

    // check lengths of names and password
    if len(firstName) < 1 || len(lastName) < 1 {
        c.JSON(400, gin.H{"error": "name is not valid"})
        return
    } else if (len(password) < 1) {
        c.JSON(400, gin.H{"error": "password is missing"})
        return
    }

    // check email address
    re := regexp.MustCompile(EmailAddrRegex)
    matched := re.Match([]byte(emailAddr))
    if !matched {
        c.JSON(400, gin.H{"error": "invalid email address"})
        return
    }

    // bcrypt password
    hash, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCostFactor)
    if err != nil {
        c.JSON(400, gin.H{"error": "an error occurred, please try again"})
        return
    }

    // insert user into the database
    var userId int
    err = stores.sqlPool.QueryRow(
        "INSERT INTO webapp.user(first_name, last_name, email," +
                                   "password, registration_time, last_login)" +
        "VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING user_id",
        firstName, lastName, emailAddr, hash).Scan(&userId)

    if err != nil || userId <= 0 {
        c.JSON(400, gin.H{"error": "registration failed, please try again"})
        return
    }
    
    // create session
    success := createUserSession(c, userId)
    if !success {
        c.JSON(200, gin.H{"message": "registration successful, please login"})
    } else {
        c.JSON(200, gin.H{"message": "registration successful"})
    }
}

func handleLogin(c *gin.Context) {
    emailAddr := c.PostForm("email")
    password  := c.PostForm("password")

    // check email address and password
    re := regexp.MustCompile(EmailAddrRegex)
    matched := re.Match([]byte(emailAddr))
    if !matched || len(password) < 1 {
        c.JSON(400, gin.H{"error": "email or password is incorrect"})
        return
    }

    // check that email matches user in database
    var passwordHash []byte
    var userId int
    var email string

    err := stores.sqlPool.QueryRow(
        "SELECT user_id, email, password FROM webapp.user " +
        "WHERE email=$1", emailAddr).Scan(&userId, &email, &passwordHash)

    // check if we got a result row
    if err != nil || userId <= 0 {
        c.JSON(400, gin.H{"error": "email or password is incorrect"})
        return
    }
    
    // check that password matches stored hash
    err = bcrypt.CompareHashAndPassword(passwordHash, []byte(password))
    if err != nil {
        c.JSON(400, gin.H{"error": "email or password is incorrect"})
        return
    }
    
    // create session
    success := createUserSession(c, userId)
    if !success {
        c.JSON(401, gin.H{"message": "unexpected error occurred"})
    } else {
        c.JSON(200, gin.H{"message": "login successful"})
    }
}

func handleLogout(c *gin.Context) {
    // get userid of logged in user, abort if 0
    userId, token := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(401, gin.H{"error": "not logged in"})
        return
    }

    // delete session & send back null cookie
    con := stores.redisPool.Get()
    defer con.Close()

    con.Do("DEL", "session_" + token)
    http.SetCookie(c.Writer, createSessionCookie("", -1))
    c.JSON(200, gin.H{"message": "logged out"})
}

func handleProfile(c *gin.Context) {
     // get userid of logged in user, abort if 0
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(200, gin.H{"loggedIn": false})
        return
    }

    // we are logged in, get user info
    var firstName string
    var lastName string
    var email string
    err := stores.sqlPool.QueryRow(
        "SELECT first_name, last_name, email FROM webapp.user " +
        "WHERE user_id=$1", userId).Scan(&firstName, &lastName, &email)

    if err != nil {
        c.JSON(500, gin.H{"loggedIn": true,
                          "error": "an unexpected error occurred"})
        return
    }


    // get user progress
    progress, err := getTotalUserProgress(userId)
    if err != nil {
        c.JSON(500, gin.H{"loggedIn": true, "error": "no progress"})
    }

    p := Profile{true, firstName, lastName, email, progress}
    c.JSON(200, p)
}

func handleGetProgress(c *gin.Context) {
    // get userid of logged in user, abort if 0
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(401, gin.H{"error": "not logged in"})
        return
    }

    familyName    := c.Param("family")
    progress, err := getUserProgress(userId, familyName)
    if err != nil {
        c.JSON(500, gin.H{"error": "no progress"})
        return
    }

    c.JSON(200, progress)
}

func handleSetProgress(c *gin.Context) {
    // get userid of logged in user, abort if 0
    userId, _ := getLoggedInUser(c)
    if userId <= 0 {
        c.JSON(401, gin.H{"error": "not logged in"})
        return
    }

    familyName := c.Param("family")
    newProgress, err := strconv.ParseUint(c.PostForm("progress"), 10, 64)
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid progress value"})
        return
    }

    valid, err := setUserProgress(userId, familyName, newProgress)
    if err != nil {
        c.JSON(500, gin.H{"error": "unexpected error occurred"})
        return
    }

    if !valid {
        c.JSON(400, gin.H{"error": "invalid progress value"})
        return
    }

    c.JSON(200, gin.H{"message": "progress has been updated"})
}

/******************************************************************************
 * Router Group for /user/*
 *****************************************************************************/

// setup /user routes
func userRoutes(user *gin.RouterGroup) {
    // test routes
    user.GET("/redis", func(c *gin.Context) {
        con := stores.redisPool.Get()
        defer con.Close()

        value, err := redis.String(con.Do("GET", "BOB1"))
        if err != nil {
            c.JSON(500, gin.H{"error": "Redis is DOWN"})
        } else {
            c.JSON(200, gin.H{"value": value})
        }
    })

    user.GET("/pgsql", func(c *gin.Context) {
        // check if connection valid
        _, err := stores.sqlPool.Query("SELECT * FROM webapp.user")
        if err != nil {
            c.JSON(500, gin.H{"error": "PG is DOWN"})
        }

        c.JSON(200, gin.H{"error": "PG is UP"})
    })

    // handle user actions
    user.POST("/register", handleRegistration)
    user.POST("/login", handleLogin)
    user.POST("/logout", handleLogout)
    user.GET("/profile", handleProfile)
    user.GET("/progress/:family", handleGetProgress)
    user.POST("/progress/:family", handleSetProgress)
}
