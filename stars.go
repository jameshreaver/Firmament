package main

import (
    "encoding/json"
    "io/ioutil"
    "log"
    "math/rand"
)

const (
    constellationPath string = "data/constellations.json"
    starPath          string = "data/stars.json"
    familiesPath      string = "data/families.json"
)

var (
    families       []Family          = make([]Family, 0)
    familySize     map[string]uint64 = make(map[string]uint64)
    constellations []Constellation   = make([]Constellation, 0)
)

type Star struct {
    Hid uint64  `json:"hid"`
    Ra  float64 `json:"ra"`
    Dec float64 `json:"dec"`
    Mag float64 `json:"mag"`
    Clr float64 `json:"clr"`
}

type Edge struct {
    Start uint64 `json:"start"`
    End   uint64 `json:"end"`
}

type Constellation struct {
    Name     string `json:"name"`
    Short    string `json:"short"`
    Family   string `json:"family"`
    Origin   string `json:"origin"`
    Meaning  string `json:"meaning"`
    Luminary string `json:"luminary"`
    Month    string `json:"month"`
    Info     string `json:"info"`
    Ra      float64 `json:"ra"`
    Dec     float64 `json:"dec"`
    Edges   []Edge  `json:"edges"`
}

type Group struct {
    Level             uint64   `json:"level"`
    Constellations    []string `json:"constellations"`
}

type Family struct {
    Name              string  `json:"name"`
    Info              string  `json:"info"`
    NumConstellations uint64  `json:"numConstellations"`
    Groups            []Group `json:"groups"`
}

func init() {
    raw, err := ioutil.ReadFile(familiesPath)
    if err != nil {
      log.Fatal("Failed to read families file.")
    }

    // unmarshal file
    json.Unmarshal(raw, &families)

    // populate family size map
    for _, family := range families {
        familySize[family.Name] = family.NumConstellations
    }

    raw, err = ioutil.ReadFile(constellationPath)
    if err != nil {
      log.Fatal("Failed to read constellations file.")
    }

    // unmarshal
    json.Unmarshal(raw, &constellations)
}

func getStars() ([]Star, error) {
    raw, err := ioutil.ReadFile(starPath)
    if err != nil {
      return []Star{}, err
    }

    stars := make([]Star, 0)
    json.Unmarshal(raw, &stars)
    return stars, err
}

func getRandomConstellations(num int) []Constellation {
    questions := make([]Constellation, 0)
    length    := len(constellations)

    for i := 0; i < num; i++ {
        randomConstellation := constellations[rand.Intn(length)]
        questions = append(questions, randomConstellation)
    }
    
    return questions
}
