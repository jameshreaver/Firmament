package main

import (
  "github.com/gin-gonic/gin"
)

// setup routes on base path /
func baseRoutes(base *gin.RouterGroup) {
    // health check
    base.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "message": "pong",
        })
    })

    // serve stars JSON
    base.GET("/stars", func(c *gin.Context) {
        stars, err := getStars()
        if err != nil {
            c.AbortWithError(500, err)
        } else {
            c.JSON(200, stars)
        }
    })

    // serve constellations JSON
    base.GET("/constellations", func(c *gin.Context) {
        c.JSON(200, constellations)
    })

    // serve families JSON
    base.GET("/families", func(c *gin.Context) {
        c.JSON(200, families)
    })

    // serve the index file on root
    base.StaticFile("/", "index.html")
    base.StaticFile("/index.html", "index.html")

    // serve all asset files on /assets/
    base.Static("/assets", "./assets")

    // deployed version (will 404 locally)
    base.StaticFile("/version", "/var/webapp/version.txt")
}
