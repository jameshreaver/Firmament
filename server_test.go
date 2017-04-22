package main

import (
  "github.com/stretchr/testify/assert"
  "github.com/gin-gonic/gin"
  "net/http"
  "net/http/httptest"
  "testing"
)

func TestPing(t *testing.T) {
    // setup request
    req, _ := http.NewRequest("GET", "/ping", nil)
    resp := httptest.NewRecorder()

    // serve request
    gin.SetMode(gin.ReleaseMode)
    GetRouter().ServeHTTP(resp, req)

    // check response headers
    assert := assert.New(t)
    assert.Equal(200, resp.Code, "response code not as expected")
    assert.Equal("application/json; charset=utf-8", resp.Header().Get("Content-Type"))

    // verify body contents
    assert.Equal("{\"message\":\"pong\"}\n", resp.Body.String(), "body does not match")
}