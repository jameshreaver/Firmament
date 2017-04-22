define(function() {

  const PI    = Math.PI,
        PI2   = Math.PI * 2,
        sin   = Math.sin,
        cos   = Math.cos,
        tan   = Math.tan,
        asin  = Math.asin,
        atan  = Math.atan,
        atan2 = Math.atan2,
        exp   = Math.exp,
        J2000 = 2451545.0,
        J1970 = 2440588.0,
        dayMs = 24 * 60 * 60 * 1000,
        obliquity = 0.409087723, // 23.439 degrees 
        rad   = PI / 180.0;


  function PlaceTime(conf) {
    if (typeof conf === 'undefined') {
      this.date      = new Date();   // in app time
      this.latitude  = 0.8997172294; // terrestrial northerly in radians
      this.longitude = 0.0;          // terrestrial easterly in radians
      const that = this;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          that.latitude  = position.coords.latitude  * rad;
          that.longitude = position.coords.longitude * rad;
        });
      }
    } else {
      this.date      = conf.date;
      this.latitude  = conf.latitude;
      this.longitude = conf.longitude;
    }
  }

  PlaceTime.prototype.celestialSphereRotation = function() {
    const lst = this.lst();
    const lat = this.latitude;
    return {x: 0.0, y: (PI / 2) - lat, z: -(lst + PI)};
  };

  PlaceTime.prototype.sunPosition = function() {
    const JD = this.julianDate(); 

    const n = JD - J2000;
    const L = (4.89495 + 0.01720279239 * n) % PI2;
    const g = (6.24004 + 0.01720197034 * n) % PI2;

    const lambda = (L + 0.03342305518 * sin(g) + 0.000349065 * sin(2 * g));

    const dec = asin(sin(obliquity) * sin(lambda));
    const ra  = atan2(sin(lambda) * cos(obliquity), cos(lambda));
    if (ra < 0) {ra += PI2;}
  
    return new EquatorialPosition(ra, dec); 
  };

  PlaceTime.prototype.julianDate = function() {
    return (this.date.getTime() / dayMs) - 0.5 + J1970;
  };

  PlaceTime.prototype.gst = function() {
    const JD = this.julianDate();
    const D  = JD - J2000; 
    const s  = (18.697374558 + 24.06570982441908 * D) % 24;
    return s * (PI2 / 24.0);
  };

  PlaceTime.prototype.lst = function() {
    return this.gst() + this.longitude;
  };



  function EquatorialPosition(ra, dec) {
    this.ra = ra;
    this.dec = dec;
  }

  EquatorialPosition.prototype.toAltAz = function(placeTime) {
    const ra  = this.ra,
          dec = this.dec,
          lat = placeTime.latitude;

    const sha = placeTime.lst() - ra;

    const alt = asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(sha));
    const az  = atan2(sin(sha), cos(sha) * sin(lat) - tan(dec) * cos(lat));

    return {alt: alt, az: PI - az};
  };



  function Star(data) {
    this.position = new EquatorialPosition(data.ra, data.dec);

    Object.assign(this, data);
  }

  Star.prototype.getScale = function getScale() {
    return 20.07 * exp(-0.548 * this.mag);
  };

  Star.prototype.getPosition = function getPosition() {
    return this.position;
  };

  Star.prototype.getColour = function getColour() {
    // heuristically calculate apparent colour of a star
    let t, r, g, b = 0.0;

    // cap BV value
    this.clr = (this.clr < -0.4) ? -0.4 : this.clr;
    this.clr = (this.clr > 2.0) ? 2.0 : this.clr;

    // calculate red component
    if (this.clr >= -0.40 && this.clr < 0.00) {
      t = (this.clr + 0.40) / (0.40);
      r = 0.61 + (0.11 * t) + (0.1 * t * t);
    } else if (this.clr >= 0.00 && this.clr < 0.40) {
      t = (this.clr) / (0.40);
      r = 0.83 + (0.17 * t);
    } else if (this.clr >= 0.40 && this.clr < 2.10) {
      r = 1.00;
    }

    // calculate green component
    if (this.clr >= -0.40 && this.clr < 0.00) {
      t = (this.clr + 0.40) / (0.40);
      g = 0.70 + (0.07 * t) + (0.1 * t * t);
    } else if (this.clr >= 0.00 && this.clr < 0.40) {
      t = (this.clr) / (0.40);
      g = 0.87 + (0.11 * t);
    } else if (this.clr >= 0.40 && this.clr < 1.60) {
      t = (this.clr - 0.40) / (1.20);
      g = 0.98 - (0.16 * t);
    } else if (this.clr >= 1.60 && this.clr < 2.00) {
      t = (this.clr - 1.60) / (0.40);
      g = 0.82 - (0.5 * t * t);
    }

    // calculate blue component
    if (this.clr >= -0.40 && this.clr < 0.40) {
      b = 1.00;
    } else if (this.clr >= 0.40 && this.clr < 1.50) {
      t = (this.clr - 0.40) / (1.10);
      b = 1.00 - (0.47 * t) + (0.1 * t * t);
    } else if (this.clr >= 1.50 && this.clr < 1.94) {
      t = (this.clr - 1.50) / (0.44);
      b = 0.63 - (0.6 * t * t);
    }

    return {r: r, g: g, b: b};
  };

  function Constellation(data) {
    Object.assign(this, data);
  }

  Constellation.prototype.edgePositions = function(stars) {
    var edgePositions = [];
    for (var i = 0, len = this.edges.length; i < len; i++) {
      const startHID = this.edges[i].start;
      const endHID  = this.edges[i].end;
      const startStar = stars[startHID];
      const endStar   = stars[endHID];
      edgePositions.push({
        start: startStar.getPosition(),
        end: endStar.getPosition()
      });
    }
    return edgePositions;
  }

  function Family(data) {
    Object.assign(this, data);
  }

  return {
    Star,
    Constellation,
    Family,
    EquatorialPosition,
    PlaceTime
  };
});
