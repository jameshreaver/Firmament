package main

import (
  "github.com/gin-gonic/gin"
  "github.com/patrickmn/go-cache"
  "net/http"
)

type responseData struct {
    status int
    header http.Header
    data   []byte
}

type cacheWriter struct {
    gin.ResponseWriter
    status  int
    written bool
    blob    []byte
}

func newCacheWriter(writer gin.ResponseWriter) *cacheWriter {
    return &cacheWriter{writer, 0, false, make([]byte, 0)}
}

func (w *cacheWriter) WriteHeader(code int) {
    w.status = code
    w.written = true
    w.ResponseWriter.WriteHeader(code)
}

func (w *cacheWriter) Status() int {
    return w.status
}

func (w *cacheWriter) Written() bool {
    return w.written
}

func (w *cacheWriter) Write(data []byte) (int, error) {
    w.status = w.ResponseWriter.Status()
    ret, err := w.ResponseWriter.Write(data)
    if err == nil {
        w.blob = append(w.blob, data...)
    }
    return ret, err
}

func GinCache(c *gin.Context) {
    // set the cache key for this request, cache IMS separately
    cacheKey         := c.Request.Method + c.Request.URL.Path
    cacheKeyProgress := "PROG" + c.Request.Method + c.Request.URL.Path
    if c.Request.Header["If-Modified-Since"] != nil {
       cacheKey = "IMS" + cacheKey
    }

    // check if already cached
    response, found := stores.cacheStore.Get(cacheKey)
    _, progress     := stores.cacheStore.Get(cacheKeyProgress)
    if found {
        c.Abort()
        c.Status(response.(*responseData).status)
        for k, vals := range response.(*responseData).header {
            if k == "X-Cache" {
                continue;
            }

            for _, v := range vals {
                c.Writer.Header().Add(k, v)
            }
        }
        c.Writer.Header().Add("X-Cache", "HIT")
        c.Writer.Write(response.(*responseData).data)
    } else if !progress {
        // set cache status (avoids race)
        stores.cacheStore.Set(cacheKeyProgress, true, cache.NoExpiration)

        // replace writer with our own
        original := c.Writer
        cached := newCacheWriter(c.Writer)
        c.Writer = cached
        c.Writer.Header().Add("X-Cache", "MISS")

        // continue with other handlers, defer setting progress to false incase
        // we crash during other handlers
        defer func(){ stores.cacheStore.Delete(cacheKeyProgress) }()
        c.Next()

        // check if return code is cachable
        if cached.status != 200 && cached.status != 304 {
            c.Writer = original
            return
        }

        // write data into store
        data := responseData{cached.status, cached.Header(), cached.blob}
        stores.cacheStore.Set(cacheKey, &data, cache.NoExpiration)
        c.Writer = original
    }
}
