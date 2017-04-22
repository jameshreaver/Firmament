define(['three', 'terrain'],
function(THREE) {

  var TerrainGeometry     = THREE.TerrainGeometry,
      MeshLambertMaterial = THREE.MeshLambertMaterial,
      Mesh                = THREE.Mesh,
      Object3D            = THREE.Object3D;

  function Ground(size, wireColour, fillColour) {
    Object3D.call(this);
    var that = this;
    this.name = "ground";

    var geometry    = new TerrainGeometry(size, size / 4);
    var material    = new MeshLambertMaterial({color: fillColour});
    var wireframe   = new MeshLambertMaterial({color: wireColour, wireframe: true});
    var solidGround = new Mesh(geometry, material);
    var wiredGround = new Mesh(geometry, wireframe);

    this.add(solidGround);
    this.add(wiredGround);
  }

  Ground.prototype = Object.create(THREE.Object3D.prototype);
  Ground.prototype.constructor = Ground;

  return {
    Ground: Ground
  };
});
