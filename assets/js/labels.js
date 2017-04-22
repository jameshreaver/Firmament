define(['three', 'event', 'model', 'text'],
function(THREE, FEVENT, FMODEL) {

  var Vector3      = THREE.Vector3,
      TextMaterial = THREE.TextMaterial,
      Sprite       = THREE.Sprite,
      Object3D     = THREE.Object3D;

  function Labels(radius) {
    Object3D.call(this);
    this.name = "labels";
    var that = this;

    FMODEL.eachConstellation(function(constellation) {
      var p = new Vector3().fromAngles(constellation.ra, constellation.dec);
      p.multiplyScalar(radius);
      var material = new TextMaterial(constellation.name);
      var sprite   = new Sprite(material);
      
      var labelWidth  = material.map.image.width;
      var labelHeight = material.map.image.height;
      sprite.scale.set(labelWidth, labelHeight, 1.0);
      sprite.position.copy(p);
      that.add(sprite);
    });

    FEVENT.on('placetime', function() {
      var cRot = FMODEL.getCelestialSphereRot();
      that.rotation.set(cRot.x, cRot.y, cRot.z);
    });
  };

  Labels.prototype = Object.create(THREE.Object3D.prototype);
  Labels.prototype.constructor = Labels;

  return {
    Labels: Labels
  };
});
