package main

import (
  "fmt"
  "flag"
  "time"
  "log"
  "math/rand"
  "database/sql"
  "github.com/gin-gonic/gin"
  "github.com/patrickmn/go-cache"
  "github.com/garyburd/redigo/redis"
  _ "github.com/lib/pq"
)

var stores struct {
    redisPool  *redis.Pool
    sqlPool    *sql.DB
    cacheStore *cache.Cache
    lobbyStore *cache.Cache
}

// setup cache store / postgres and redis connection pools
func init() {
    // create in-memory store for cache
    stores.cacheStore = cache.New(5*time.Minute, 30*time.Second)
    stores.lobbyStore = cache.New(24*time.Hour,  30*time.Second)

    // this will always return a valid pool, errors gracefully on access
    stores.redisPool = redis.NewPool(func() (redis.Conn, error) {
            return redis.Dial("unix", "/var/run/redis/redis.sock")
        }, 16)

    // as with redis, won't open connection until used - but may error for invalid args
    db, err := sql.Open("postgres", "host=/var/run/postgresql/ user=webapp dbname=webapp")
    if err != nil {
        log.Fatal("postgresql connection arguments appear invalid")
    }
    stores.sqlPool = db

    // initialise random seed
    rand.Seed(time.Now().UTC().UnixNano())
}

// create and setup the gin engine
func GetRouter() *gin.Engine {
    // parse command line arguments
    noCache := flag.Bool("nocache", false, "disable web server cache")
    flag.Parse()

    // create new router
    r := gin.Default()

    // use cache unless disabled
    if (*noCache) {
        fmt.Println("Web server cache has been disabled")
    }

    // base routes
    base := r.Group("/")
    if (!*noCache) {
        base.Use(GinCache)
    }
    baseRoutes(base)

    // user routes
    userRoutes(r.Group("/user"))
    leaderboardRoutes(r.Group("/leaderboard"))
    lobbyRoutes(r.Group("/lobby"))

    // return router
    return r
}

func main() {
    // listen and serve on 0.0.0.0:8080
    gin.SetMode(gin.ReleaseMode)
    GetRouter().Run()
}
