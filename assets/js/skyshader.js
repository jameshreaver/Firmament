/**
 * Adapted for Firmament from
 * https://github.com/mrdoob/three.js/blob/master/examples/js/SkyShader.js
 */
define(['three'],
function(THREE) {

THREE.ShaderLib.sky = {
  uniforms: {
    sunPosition: {
      type: "v3",
      value: new THREE.Vector3()
    }
  },

  vertexShader: [
    "varying vec3 vWorldPosition;",
    "void main() {",
      "vec4 worldPosition = modelMatrix * vec4(position, 1.0);",
      "vWorldPosition     = worldPosition.xyz;",

      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}",
  ].join("\n"),

  fragmentShader: [ // atmospheric shading
    "varying vec3 vWorldPosition;",
    "uniform vec3 sunPosition;",

    // mathematical constants
    "const float e  = 2.718281828459045;",
    "const float pi = 3.141592653589793;",

    // atmopsheric parameters
    "const float turbidity = 1.0;",
    "const float rayleigh  = 2.0;",

    "const float mieCoefficient  = 0.005;",
    "const float mieDirectionalG = 0.85;",

    // optical length at zenith for molecules
    "const float rayleighZenithLength = 8.4E3;",
    "const float mieZenithLength = 1.25E3;",
    "const vec3 up = vec3(0.0, 0.0, 1.0);",

    // rayleigh constants
    "const float n  = 1.0003;",   // refractive index of air
    "const float N  = 2.545E25;", // molecules per unit volume for air at STP
    "const float pn = 0.035;",    // depolarization factor

    // wavelength of primary colours
    "const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);",

    // K coefficient of primaries
    "const vec3 K = vec3(0.686, 0.678, 0.666);",
		// Junge's exponent
    "const float v = 4.0;",

    // maximum sun intensity
    "const float EE = 1000.0;",
    "const float sunAngularDiameterCos = 0.9999;",

    // earth shadow hack
    "const float cutoffAngle = pi / 1.95;",
    "const float steepness = 1.5;",

    // total scattering coefficient for Rayleigh scattering
    "vec3 totalRayleigh(vec3 lambda)",
    "{",
      "return 0.0005 / vec3(94, 40, 18);",
    "}",

    "float rayleighPhase(float cosTheta)",
    "{",
      "return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));",
    "}",

    // total scattering coefficient for Mie scattering
    "vec3 totalMie(vec3 lambda, vec3 K, float T)",
    "{",
      "float c = (0.2 * T ) * 10E-18;",
      "return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;",
    "}",

    "float miePhase(float cosTheta, float g)",
    "{",
      "return (1.0 / (4.0 * pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));",
    "}",

    "float sunIntensity(float zenithAngleCos)",
    "{",
      "return EE * max(0.0, 1.0 - exp(-((cutoffAngle - acos(zenithAngleCos)) / steepness)));",
    "}",

    // filmic tone map
    "float A = 0.15;",
    "float B = 0.50;",
    "float C = 0.10;",
    "float D = 0.20;",
    "float E = 0.02;",
    "float F = 0.30;",
    "float W = 128.0;",

    "vec3 Uncharted2Tonemap(vec3 x)",
    "{",
       "return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;",
    "}",

    "void main() ",
    "{",
      "float sunDistance = length(sunPosition);",
      "float sunfade = 1.0 - clamp(1.0 - exp(sunPosition.y / sunDistance), 0.0, 1.0);",
      "float rayleighCoefficient = rayleigh - (1.0 - sunfade);",

      "vec3 sunDirection = normalize(sunPosition);",

      "vec3 betaR = totalRayleigh(lambda) * rayleighCoefficient;",
      "vec3 betaM = totalMie(lambda, K, turbidity) * mieCoefficient;",

      // angle to sun: cut off at 90
      "float zenithAngle = acos(max(0.0, dot(up, normalize(vWorldPosition))));",

      // relative optical mass
      "float AM = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));",

      // relative optical mass for Rayleigh and Mie
      "float sR = rayleighZenithLength * AM;",
      "float sM = mieZenithLength * AM;", 

      // combined extinction factor exponential falloff
      "vec3 Fex = exp(-(betaR * sR + betaM * sM));",

      // cos of angle from sun
      "float cosTheta = dot(normalize(vWorldPosition), sunDirection);",

      "float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);",
      "float mPhase = miePhase(cosTheta, mieDirectionalG);",
      "vec3 betaRTheta = betaR * rPhase;",
      "vec3 betaMTheta = betaM * mPhase;",

      "float sunE = sunIntensity(dot(sunDirection, up));",
      "vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3(1.5));",
      "Lin *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, sunDirection), 5.0), 0.0, 1.0));",

      // luminance hack
      "vec3 texColor = Lin * 0.0385;",

      // night sky colours
      "texColor += vec3(0.0001, 0.001, 0.01);",

			// sun disk
			"float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);",
			"texColor += sundisk * 16.0;",

      // tone map
      "vec3 curr = Uncharted2Tonemap(texColor);",
			"vec3 whiteScale = 1.0 / Uncharted2Tonemap(vec3(W));",

			// return tone mapped color
      "gl_FragColor.rgb = pow(curr * whiteScale, vec3(1.0 / (1.2 + (1.2 * sunfade))));",
      "gl_FragColor.a = 1.0;",
    "}",
  ].join( "\n" )

};

THREE.SkyMaterial = function () {
  var skyShader = THREE.ShaderLib.sky;
  var skyUniforms = THREE.UniformsUtils.clone(skyShader.uniforms);
  return new THREE.ShaderMaterial({
   fragmentShader: skyShader.fragmentShader,
    vertexShader: skyShader.vertexShader,
    uniforms: skyUniforms
  });
};

});
