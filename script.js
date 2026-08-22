let audioA=null, audioB=null, ctxA=null, ctxB=null;
let isPlayingA=false, isPlayingB=false;

for(let i=0;i<8;i++){
  document.getElementById('masterDots').innerHTML += '<div class="dot" id="dm'+i+'"></div>';
}

// WebGL
const canvas = document.getElementById('visualizer');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

let particleCount = 60;
let particles = [];

function resizeCanvas(){
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 180;
  canvas.style.width = canvas.parentElement.clientWidth + 'px';
  canvas.style.height = '180px';
  if(gl) gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

if(gl){
  // Shader برنامه
  const vsSource = `
    attribute vec4 a_position;
    attribute float a_size;
    attribute vec4 a_color;
    varying vec4 v_color;
    uniform float u_time;
    uniform float u_intensity;
    void main(){
      vec4 pos = a_position;
      pos.x += sin(u_time + a_position.y) * 0.1 * u_intensity;
      pos.y += cos(u_time + a_position.x) * 0.1 * u_intensity;
      gl_Position = pos;
      gl_PointSize = a_size * (0.5 + u_intensity);
      v_color = a_color;
    }
  `;
  const fsSource = `
    precision mediump float;
    varying vec4 v_color;
    void main(){
      float d = length(gl_PointCoord - vec2(0.5));
      if(d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.0, 0.5, d);
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }
  `;

  function createShader(type, source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  // ذرات
  for(let i=0;i<particleCount;i++){
    particles.push({
      x: Math.random()*2-1,
      y: Math.random()*2-1,
      size: Math.random()*10+5,
      r: Math.random(),
      g: Math.random(),
      b: Math.random()
    });
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleCount*2), gl.DYNAMIC_DRAW);

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleCount*3), gl.DYNAMIC_DRAW);

  const sizeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleCount), gl.DYNAMIC_DRAW);

  const a_position = gl.getAttribLocation(program, 'a_position');
  const a_size = gl.getAttribLocation(program, 'a_size');
  const a_color = gl.getAttribLocation(program, 'a_color');
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_intensity = gl.getUniformLocation(program, 'u_intensity');

  function drawWebGL(intensity){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const positions = [];
    const sizes = [];
    const colors = [];

    for(let i=0;i<particleCount;i++){
      const p = particles[i];
      positions.push(p.x, p.y);
      sizes.push(p.size);
      colors.push(p.r, p.g, p.b);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(a_size);
    gl.vertexAttribPointer(a_size, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(a_color);
    gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);

    gl.uniform1f(u_time, Date.now()/1000);
    gl.uniform1f(u_intensity, intensity/255);

    gl.drawArrays(gl.POINTS, 0, particleCount);
  }

  function drawCanvas(intensity){
    const cctx = canvas.getContext('2d');
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    cctx.fillStyle = 'rgba(0,0,0,0.4)';
    cctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

document.getElementById('fileA').addEventListener('change', e=>{
  if(e.target.files[0]){
    audioA = new Audio(URL.createObjectURL(e.target.files[0]));
    audioA.loop = true;
    setupAudio('A');
    document.getElementById('status').textContent = 'کانال A آماده';
  }
});

document.getElementById('fileB').addEventListener('change', e=>{
  if(e.target.files[0]){
    audioB = new Audio(URL.createObjectURL(e.target.files[0]));
    audioB.loop = true;
    setupAudio('B');
    document.getElementById('status').textContent = 'کانال B آماده';
  }
});

function setupAudio(ch){
  const audio = ch === 'A' ? audioA : audioB;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  const gain = ctx.createGain();
  gain.gain.value = 2.5;
  const src = ctx.createMediaElementSource(audio);
  src.connect(analyser);
  analyser.connect(gain);
  gain.connect(ctx.destination);
  if(ch === 'A') ctxA = {ctx, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount)};
  else ctxB = {ctx, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount)};
}

function toggle(ch){
  const audio = ch === 'A' ? audioA : audioB;
  const vinyl = document.getElementById('vinyl' + ch);
  const btn = document.getElementById('btn' + ch);
  const isPlaying = ch === 'A' ? isPlayingA : isPlayingB;
  if(!audio){ alert('آهنگ را انتخاب کن'); return; }
  if(isPlaying){
    audio.pause();
    vinyl.classList.remove('spinning');
    btn.textContent = '▶️ پخش ' + ch;
    if(ch === 'A'){ isPlayingA = false; ctxA.ctx.suspend(); }
    else { isPlayingB = false; ctxB.ctx.suspend(); }
  } else {
    audio.play();
    vinyl.classList.add('spinning');
    btn.textContent = '⏸️ توقف ' + ch;
    if(ch === 'A'){ isPlayingA = true; ctxA.ctx.resume(); }
    else { isPlayingB = true; ctxB.ctx.resume(); }
    detectBeat();
  }
}

document.getElementById('volA').addEventListener('input', e=>{
  if(ctxA) ctxA.gain.gain.value = e.target.value * 3;
});

document.getElementById('volB').addEventListener('input', e=>{
  if(ctxB) ctxB.gain.gain.value = e.target.value * 3;
});

document.getElementById('crossfade').addEventListener('input', e=>{
  const val = parseFloat(e.target.value);
  const volA = document.getElementById('volA').value;
  const volB = document.getElementById('volB').value;
  if(ctxA) ctxA.gain.gain.value = Math.max(0, 1 - val) * volA * 3;
  if(ctxB) ctxB.gain.gain.value = val * volB * 3;
});

function detectBeat(){
  let bassA = 0, bassB = 0;
  if(ctxA && isPlayingA){
    ctxA.analyser.getByteFrequencyData(ctxA.data);
    for(let i = 0; i < 15; i++) bassA += ctxA.data[i];
    bassA /= 15;
  }
  if(ctxB && isPlayingB){
    ctxB.analyser.getByteFrequencyData(ctxB.data);
    for(let i = 0; i < 15; i++) bassB += ctxB.data[i];
    bassB /= 15;
  }
  const intensity = Math.max(bassA, bassB);
  const threshold = 65;
  if(intensity > threshold){
    document.body.style.background = '#1a0a2a';
    for(let i = 0; i < 8; i++) document.getElementById('dm' + i).classList.add('on');
  } else {
    document.body.style.background = '#0a0a12';
    for(let i = 0; i < 8; i++) document.getElementById('dm' + i).classList.remove('on');
  }
  if(gl && typeof drawWebGL === 'function') drawWebGL(intensity);
  else if(typeof drawCanvas === 'function') drawCanvas(intensity);
  if(isPlayingA || isPlayingB) requestAnimationFrame(detectBeat);
}
