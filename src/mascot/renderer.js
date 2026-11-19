// A tiny WebGL renderer for the mascot. No dependencies: one shader, one
// dynamic buffer, one draw call per pass. The canvas is small (a few hundred
// px) and follows the cat around, so it costs almost nothing to composite.

const VERT = `
attribute vec3 aPos;
attribute vec3 aNrm;
attribute float aMat;
uniform mat3 uRot;        // model rotation
uniform vec3 uPivot;      // rotation pivot in cat space
uniform vec3 uScale;      // squash & stretch
uniform vec4 uProj;       // focal, camera distance, origin x, origin y (ndc)
uniform vec2 uShift;      // extra ndc shift (motion echoes)
varying vec3 vN;
varying float vMat;
varying vec3 vP;
void main() {
  vP = aPos;
  vec3 p = uRot * ((aPos - uPivot) * uScale) + uPivot;
  vN = uRot * (aNrm / uScale);
  vMat = aMat;
  float w = uProj.y - p.z;
  gl_Position = vec4(p.x * uProj.x + (uProj.z + uShift.x) * w, p.y * uProj.x + (uProj.w + uShift.y) * w, -p.z * 0.25 * w, w);
}`;

const FRAG = `
precision highp float;
uniform vec3 uBase;
uniform vec3 uRim;
uniform float uRimAmt;
uniform vec3 uEye;
uniform float uAlpha;
varying vec3 vN;
varying float vMat;
varying vec3 vP;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  vec3 n = normalize(vN);
  vec3 c;
  if (vMat < 0.5) {
    // soft studio key from the upper left, like the hero photograph
    float d = dot(n, normalize(vec3(-0.42, 0.78, 0.46))) * 0.5 + 0.5;
    d *= d;
    float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.6);
    float top = clamp(n.y * 0.6 + 0.55, 0.0, 1.0);
    // short fur: fine streaks along the body break up the smooth surface,
    // and the sheen is soft and broad rather than a hard highlight
    float fur = vnoise(vec3(vP.x * 46.0, vP.y * 150.0, vP.z * 150.0)) * 0.6 + vnoise(vP * 420.0) * 0.4;
    c = uBase * (0.5 + 1.9 * d) * (0.8 + 0.4 * fur) + uRim * fres * top * uRimAmt * (0.7 + 0.6 * fur);
  } else if (vMat < 1.5) {
    c = uEye * (0.88 + 0.16 * clamp(n.z, 0.0, 1.0));          // iris
  } else if (vMat < 2.5) {
    c = vec3(0.02);                                            // pupil, lid line
  } else if (vMat < 3.5) {
    c = mix(vec3(0.3), vec3(0.62), uRimAmt);                   // whiskers
  } else if (vMat < 4.5) {
    c = uEye * 0.4;                                            // deeper ring round the iris
  } else if (vMat < 5.5) {
    c = vec3(1.0);                                             // catchlight
  } else if (vMat < 6.5) {
    float d = dot(n, normalize(vec3(-0.42, 0.78, 0.46))) * 0.5 + 0.5;
    c = vec3(0.085, 0.07, 0.07) * (0.5 + 1.3 * d);             // nose leather
  } else {
    float d = dot(n, normalize(vec3(-0.42, 0.78, 0.46))) * 0.5 + 0.5;
    c = (uBase * 1.5 + vec3(0.03, 0.016, 0.016)) * (0.5 + 1.4 * d * d); // inner ear
  }
  gl_FragColor = vec4(c * uAlpha, uAlpha);
}`;

const SHADOW_VERT = `
attribute vec2 aQ;
uniform vec4 uRect;   // centre x,y and half size x,y in ndc
varying vec2 vQ;
void main() { vQ = aQ; gl_Position = vec4(uRect.xy + aQ * uRect.zw, 0.0, 1.0); }`;
const SHADOW_FRAG = `
precision mediump float;
uniform float uAlpha;
varying vec2 vQ;
void main() {
  float d = length(vQ);
  float a = smoothstep(1.0, 0.15, d);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * uAlpha);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.init(); });
    this.init();
  }

  init() {
    const gl = this.canvas.getContext('webgl', {
      alpha: true, antialias: true, premultipliedAlpha: true, depth: true,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
    if (!gl) return;
    this.gl = gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const link = (vs, fs) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
      return p;
    };
    try {
      this.prog = link(VERT, FRAG);
      this.shadowProg = link(SHADOW_VERT, SHADOW_FRAG);
    } catch (err) {
      return;
    }
    const u = (p, n) => gl.getUniformLocation(p, n);
    this.u = {
      rot: u(this.prog, 'uRot'), pivot: u(this.prog, 'uPivot'), scale: u(this.prog, 'uScale'),
      proj: u(this.prog, 'uProj'), shift: u(this.prog, 'uShift'), base: u(this.prog, 'uBase'),
      rim: u(this.prog, 'uRim'), rimAmt: u(this.prog, 'uRimAmt'), eye: u(this.prog, 'uEye'), alpha: u(this.prog, 'uAlpha'),
    };
    this.a = {
      pos: gl.getAttribLocation(this.prog, 'aPos'),
      nrm: gl.getAttribLocation(this.prog, 'aNrm'),
      mat: gl.getAttribLocation(this.prog, 'aMat'),
    };
    this.su = { rect: u(this.shadowProg, 'uRect'), alpha: u(this.shadowProg, 'uAlpha') };
    this.sa = { q: gl.getAttribLocation(this.shadowProg, 'aQ') };
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.qbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.qbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vboSize = 0;
    this.iboSize = 0;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.ok = true;
  }

  resize(cssSize, dpr) {
    const px = Math.round(cssSize * dpr);
    if (this.canvas.width !== px) {
      this.canvas.width = px;
      this.canvas.height = px;
    }
  }

  /**
   * @param mesh    Mesh (model.js)
   * @param o       { rot: Float32Array(9), pivot, scale, focal, dist, ox, oy,
   *                  base, rim, rimAmt, eye, alpha, shadow, shadowRect, echoes: [{x,y,a}] }
   */
  draw(mesh, o) {
    if (!this.ok || this.lost) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (o.alpha <= 0.003) return;

    // contact shadow
    if (o.shadow > 0.003) {
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.shadowProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.qbo);
      gl.enableVertexAttribArray(this.sa.q);
      gl.vertexAttribPointer(this.sa.q, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(this.su.rect, o.shadowRect);
      gl.uniform1f(this.su.alpha, o.shadow * o.alpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(this.sa.q);
    }

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const vdata = mesh.v.subarray(0, mesh.nv * 7);
    if (vdata.length > this.vboSize) {
      gl.bufferData(gl.ARRAY_BUFFER, mesh.v.length * 4, gl.DYNAMIC_DRAW);
      this.vboSize = mesh.v.length;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vdata);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    const idata = mesh.i.subarray(0, mesh.ni);
    if (idata.length > this.iboSize) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.i.length * 2, gl.DYNAMIC_DRAW);
      this.iboSize = mesh.i.length;
    }
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idata);
    const st = 28;
    gl.enableVertexAttribArray(this.a.pos);
    gl.enableVertexAttribArray(this.a.nrm);
    gl.enableVertexAttribArray(this.a.mat);
    gl.vertexAttribPointer(this.a.pos, 3, gl.FLOAT, false, st, 0);
    gl.vertexAttribPointer(this.a.nrm, 3, gl.FLOAT, false, st, 12);
    gl.vertexAttribPointer(this.a.mat, 1, gl.FLOAT, false, st, 24);

    gl.uniformMatrix3fv(this.u.rot, false, o.rot);
    gl.uniform3fv(this.u.pivot, o.pivot);
    gl.uniform3fv(this.u.scale, o.scale);
    gl.uniform4f(this.u.proj, o.focal, o.dist, o.ox, o.oy);
    gl.uniform3fv(this.u.base, o.base);
    gl.uniform3fv(this.u.rim, o.rim);
    gl.uniform1f(this.u.rimAmt, o.rimAmt);
    gl.uniform3fv(this.u.eye, o.eye);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // motion echoes first (the cat "a beat behind itself"), then the cat
    const echoes = o.echoes;
    if (echoes) {
      for (let k = echoes.length - 1; k >= 0; k--) {
        const e = echoes[k];
        if (e.a <= 0.01) continue;
        gl.uniform2f(this.u.shift, e.x, e.y);
        gl.uniform1f(this.u.alpha, e.a * o.alpha);
        gl.drawElements(gl.TRIANGLES, mesh.ni, gl.UNSIGNED_SHORT, 0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
      }
    }
    gl.uniform2f(this.u.shift, 0, 0);
    gl.uniform1f(this.u.alpha, o.alpha);
    gl.drawElements(gl.TRIANGLES, mesh.ni, gl.UNSIGNED_SHORT, 0);
  }
}
