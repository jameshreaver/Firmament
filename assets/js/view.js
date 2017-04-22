define(['jquery', 'event','three', 'model', 'controls', 'constellations', 'ground', 'labels', 'sky', 'stars', 'compass'],
function($, FEVENT, THREE, FMODEL, FCONTROLS, FCONSTELLATIONS, FGROUND, FLABELS, FSKY, FSTARS, FCOMPASS) {

  const PerspectiveCamera    = THREE.PerspectiveCamera,
        Scene                = THREE.Scene,
        WebGLRenderer        = THREE.WebGLRenderer,
        Vector3              = THREE.Vector3,

        Controls             = FCONTROLS.Controls,

        Constellations       = FCONSTELLATIONS.Constellations,
        Ground               = FGROUND.Ground,
        Sky                  = FSKY.Sky,
        Stars                = FSTARS.Stars,
        Compass              = FCOMPASS.Compass,
        Labels               = FLABELS.Labels;

  const constellationColour = 0xffffff,
        farPlane            = 4096,  // far clipping plane
        sunRadius           = 2048,
        starRadius          = 1024,
        labelRadius         = 640,
        fov                 = 76,    // camera field of view
        nearPlane           = 0.1,   // near clipping plane
        antialiasing        = false;  // attempt antialiasing

  var scene,
      controls;

  function init() {
    initDisplay();
    initSky();
    initGround();
    initCompass();
    initStars();
    initConstellations();
    initLabels();
  }

  function initDisplay() {
    var width  = $(window).width();
    var height = $(window).height();
    var dpr    = window.devicePixelRatio ? window.devicePixelRatio : 1;

    scene = new Scene();

    var camera = new PerspectiveCamera(fov, width / height, nearPlane, farPlane);
    camera.position.set(0.0, 0.0, 4.0);
    camera.up.set(0.0, 0.0, 1.0);

    var renderer = new WebGLRenderer({antialias: antialiasing});
    renderer.setClearColor(0x000000, 1.0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);

    $(window).resize(function() {
      width  = $(window).width();
      height = $(window).height();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });

    (function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    })();

    $("body").append(renderer.domElement); // attach display to DOM

    controls = new Controls(camera);

    FEVENT.on('visibility', function(event) {
      toggleVisibility(event.objectName);
    });

    FEVENT.on('visibilityoff', function(event) {
      disableVisibility(event.objectName); 
    });
  }

  function initStars() {
    $.when(FMODEL.starsLoaded).done(function() {
      var stars = new Stars(starRadius - 1);
      scene.add(stars);
    });
  }

  function initConstellations() {
    $.when(FMODEL.constellationsLoaded, FMODEL.starsLoaded).done(function() {
      var constellations = new Constellations(starRadius);
      scene.add(constellations);

      // rotate constellations as time and place changes
      FEVENT.on('placetime', function() {
        var cRot     = FMODEL.getCelestialSphereRot();
        constellations.rotation.set(cRot.x, cRot.y, cRot.z);
      });

      FEVENT.on('selectedfamily', function(event) {
        constellations.clearHighlight();
        if (event.family) {
          constellations.highlightFamily(event.family);
          var altAz = FMODEL.getFamilyAltAz(event.family);
          glideToAngles(altAz.az, altAz.alt);
        }
      });

      // highlight single constellation on event
      FEVENT.on('selectedconstellation', function(event) {
        constellations.clearHighlight();
        if (event.constellation) {
          constellations.highlight(event.constellation);
          var altAz = FMODEL.getConstellationAltAz(event.constellation);
          glideToAngles(altAz.az, altAz.alt);
        }
      });

      // clear all highlights
      FEVENT.on('clearhighlight', function(event) {
        constellations.clearHighlight();
      });
    });
  }

  function initLabels() {
    $.when(FMODEL.constellationsLoaded).done(function() {
      var labels = new Labels(labelRadius);
      labels.visible = false;
      scene.add(labels);
    });
  }

  function initCompass() {
    var compass = new Compass(labelRadius);
    scene.add(compass);
  }

  function initSky() {
    var sky = new Sky(sunRadius);
    scene.add(sky);
  }

  function initGround() {
    var ground = new Ground(starRadius, 0xc6c6bf, 0xffffff);
    scene.add(ground);
  }

  THREE.Vector3.prototype.fromAngles = function(theta, phi) {
    this.x = Math.cos(phi) * Math.cos(theta);
    this.y = Math.cos(phi) * Math.sin(theta);
    this.z = Math.sin(phi);
    return this;
  };

  function toggleVisibility(objectName) {
    let obj = scene.getObjectByName(objectName, true);
    if (typeof obj === 'undefined') {
      console.warn("No such object: " + objectName);
      return;
    } 
    obj.visible = !obj.visible;
  }

  function disableVisibility(objectName) {
    let obj = scene.getObjectByName(objectName, true);
    if (typeof obj === 'undefined') {
      console.warn("No such object: " + objectName);
      return;
    } 
    obj.visible = false;
  }

  function glideToAngles(theta, phi) {
    controls.panTo(new Vector3().fromAngles(theta, phi).multiplyScalar(sunRadius));
  }

  function getViewCenterPoint() {
    const TWOPI = Math.PI * 2;
    let pitch = controls.camera.rotation.x - (Math.PI / 2);
    let yaw = controls.camera.rotation.z + (Math.PI / 2);

    // correct yaw to (-PI, PI) range
    yaw = yaw % TWOPI;
    if (yaw > Math.PI) {
      yaw = yaw - TWOPI;
    } else if (yaw < -Math.PI) {
      yaw = TWOPI + yaw;
    }

    // position
    let pos = new Vector3().fromAngles(yaw, pitch);
    const cRot = FMODEL.getCelestialSphereRot();
    var rot  = new THREE.Euler(-cRot.x, -cRot.y, -cRot.z);
    pos.applyEuler(rot);

    // convert back into Ra/Dec
    const dec = Math.asin(pos.z);
    const ra  = Math.acos(pos.x / Math.cos(dec));
    if (pos.y < 0) {
      ra = -ra;
    }

    return {ra, dec};
  }

  return {
    init,
    toggleVisibility,
    glideToAngles,
    getViewCenterPoint
  };
});
