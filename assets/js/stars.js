define(['three', 'event', 'model', 'starshader'],
function(THREE, FEVENT, FMODEL) {

  const Object3D        = THREE.Object3D,
        Vector3         = THREE.Vector3,
        Geometry        = THREE.Geometry,
        TextureLoader   = THREE.TextureLoader,
        StarMaterial    = THREE.StarMaterial,
        BufferAttribute = THREE.BufferAttribute,
        Points          = THREE.Points,
        AmbientLight    = THREE.AmbientLight,
        BufferGeometry  = THREE.BufferGeometry;

  function Stars(radius) {
    Object3D.call(this);
    var that = this;
    this.name = "stars";
    
    const loader = new TextureLoader();
    // wait for texture load
    loader.load("assets/img/star16.png", function(texture) { 
      const material = new StarMaterial();
      material.uniforms.texture.value = texture;
      material.uniforms.opacity.value = 1.0;
      const n = FMODEL.getNumberStars();

      const positions = new Float32Array(n * 3);
      const colours   = new Float32Array(n * 3);
      const sizes     = new Float32Array(n);

      let i  = 0;
      let i3 = 0;
      FMODEL.eachStar(function(star) {
        const p_ = star.getPosition();
        const p = new Vector3().fromAngles(p_.ra, p_.dec);
        p.multiplyScalar(radius);
        const s = star.getScale();
        const c = star.getColour();

        positions[i3 + 0] = p.x;
        positions[i3 + 1] = p.y;
        positions[i3 + 2] = p.z;

        colours[i3 + 0] = c.r;
        colours[i3 + 1] = c.g;
        colours[i3 + 2] = c.b;

        sizes[i] = s;

        i++;
        i3 += 3;
      }); 

      const geometry = new BufferGeometry();
      geometry.addAttribute('position', new BufferAttribute(positions, 3));
      geometry.addAttribute('colour',   new BufferAttribute(colours, 3));
      geometry.addAttribute('size',     new BufferAttribute(sizes, 1));

      const stars = new Points(geometry, material);
      that.add(stars);

      FEVENT.on('placetime', function() {
        const cRot = FMODEL.getCelestialSphereRot();
        that.rotation.set(cRot.x, cRot.y, cRot.z);
        // fade in stars when sun between 0 and 6 degrees below horizon
        const theta = FMODEL.getSunAltAz().alt;
        const phi   = -6.0 * (Math.PI / 180);
        const op = Math.min(Math.max(theta / phi, 0.0), 1.0);
        stars.material.uniforms.opacity.value = op;
      });

      // starlight for night
      const light = new AmbientLight(0xf7f7e7, 0.05);
      that.add(light);
    });

  };

  Stars.prototype = Object.create(THREE.Object3D.prototype);
  Stars.prototype.constructor = Stars;

  return {
    Stars: Stars
  };

});
