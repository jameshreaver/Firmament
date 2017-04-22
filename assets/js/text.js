define(['three'],
function(THREE) {

THREE.TextMaterial = function(text) {
  const texture = this.textToTexture(text);
  THREE.SpriteMaterial.call(this, {map: texture, depthTest: true});
};

THREE.TextMaterial.prototype = Object.create(THREE.SpriteMaterial.prototype);
THREE.TextMaterial.prototype.constructor = THREE.TextMaterial;

THREE.TextMaterial.prototype.textToTexture = (function() {
  const fontSize = 16;

  // create an off screen canvas for rendering text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width  = fontSize * 32; // rough estimate 
  canvas.height = fontSize * 2;

  context.font      = fontSize + "px Helvetica";
  context.fillStyle = "rgba(255,255,255,1.0)";

  // renders text to a canvas and creates texture
  return function(text) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text, 0, fontSize);
    const textWidth = context.measureText(text).width;
    const tex = new THREE.Texture(context.getImageData(0, 0, textWidth, fontSize * 2));
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  };
})();

});
