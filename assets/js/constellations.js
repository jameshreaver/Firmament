define(['three', 'model'],
function(THREE, FMODEL) {

  var LineBasicMaterial = THREE.LineBasicMaterial,
      Object3D          = THREE.Object3D,
      Vector3           = THREE.Vector3,
      Geometry          = THREE.Geometry,
      Line              = THREE.Line;


  function Constellations(radius) {

    Object3D.call(this);

    this._highlightedFamily        = null;
    this._highlightedConstellation = null;

    var that = this;
    this.name = "constellations";

    FMODEL.eachConstellation(function(constellation) {
      var material = new LineBasicMaterial({opacity: 0.30, transparent: true});

      var constellationLines = new Object3D();
      constellationLines.name = constellation.name;

      var edges = constellation.edges;
      for (var i = 0, len = edges.length; i < len; i++) {
        var edge = edges[i];
        var geometry = new Geometry();

        // get start star
        var s = FMODEL.getStar(edge.start).getPosition();
        var sp = new Vector3().fromAngles(s.ra, s.dec);
        sp.multiplyScalar(radius);
        geometry.vertices.push(sp);

        // get end star
        var e = FMODEL.getStar(edge.end).getPosition();
        var ep = new Vector3().fromAngles(e.ra, e.dec);
        ep.multiplyScalar(radius);
        geometry.vertices.push(ep);

        // draw line between them
        var line = new Line(geometry, material);
        geometry.computeLineDistances();
        constellationLines.add(line); 
        that.add(constellationLines);
      }
    });

  };

  Constellations.prototype = Object.create(THREE.Object3D.prototype);
  Constellations.prototype.constructor = Constellations;

  Constellations.prototype.highlight = function(name) {
    var constellation = this.getObjectByName(name, true);
    constellation.traverse(function(child) {
      if (child instanceof Line) {
        child.material.opacity = 1.0;
      }
    });
  };

  Constellations.prototype.highlightFamily = function(name) {
    var family = FMODEL.getFamily(name);
    for (var i = 0, ii = family.groups.length; i < ii; i++) {
      var group = family.groups[i];
      for (var j = 0, jj = group.constellations.length; j < jj; j++) {
        this.highlight(group.constellations[j]); 
      }
    }
  };

  Constellations.prototype.clearHighlight = function() {
    this.traverse(function(child) {
      if (child instanceof Line) {
        child.material.opacity = 0.3;
      }
    });
  };

  return {
    Constellations: Constellations
  };

});
