define(['three'],
function(THREE) {

THREE.ShaderLib.stars = {
  uniforms: {
    texture: {type: "t", value: {}},
    opacity: {type: "f", value: 1.0}
  },
  vertexShader: [
    'attribute vec3 colour;',
    'attribute float size;',
    
    'varying vec3 vColour;',
    
    'void main() {',
      'vColour = colour;',
      'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
      'gl_PointSize = size;',
      'gl_Position = projectionMatrix * mvPosition;',
    '}'
  ].join('\n'),
  fragmentShader: [
    'varying vec3 vColour;',

    'uniform sampler2D texture;',
    'uniform float opacity;',

    'void main() {',
      'float alpha  = length(texture2D(texture, gl_PointCoord).xyz);',
	  'gl_FragColor = vec4(vColour, alpha * opacity);',
    '}'
  ].join('\n')
};

THREE.StarMaterial = function() {
  const starShader   = THREE.ShaderLib.stars;
  const starUniforms = THREE.UniformsUtils.clone(starShader.uniforms);
  return new THREE.ShaderMaterial({
    fragmentShader: starShader.fragmentShader,
    vertexShader: starShader.vertexShader,
    uniforms: starUniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
};

});
