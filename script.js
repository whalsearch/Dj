let audioA=null, audioB=null, ctxA=null, ctxB=null;
let isPlayingA=false, isPlayingB=false;

// نقطه‌های ضرب
for(let i=0;i<8;i++){
  document.getElementById('masterDots').innerHTML += '<div class="dot" id="dm'+i+'"></div>';
}

// الماس‌ها
let diamonds=[];
for(let i=0;i<40;i++){
  diamonds.push({
    x: Math.random()*500,
    y: Math.random()*200,
    r: Math.random()*8+4,
    vx: Math.random()*2,
    vy: Math.random()*2,
    rot: Math.random()*Math.PI,
    alpha: Math.random()*0.8+0.2,
    color: 'hsl('+Math.random()*360+',100%,60%)'
  });
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
  
  if(ch === 'A'){
    ctxA = {ctx, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount)};
  } else {
    ctxB = {ctx, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount)};
  }
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

const canvas = document.getElementById('visualizer');
const cctx = canvas.getContext('2d');

function resizeCanvas(){
  canvas.width = canvas.parentElement.clientWidth * 2;
  canvas.height = 180 * 2;
  canvas.style.height = '180px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawVisualizer(intensity, bassA, bassB){
  cctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // پس‌زمینه
  cctx.fillStyle = 'rgba(0,0,0,0.4)';
  cctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // الماس‌ها
  diamonds.forEach(d => {
    d.x += d.vx * (intensity/40 + 0.5);
    d.y += d.vy * (intensity/40 + 0.5);
    d.rot += 0.08;
    
    if(d.x < -20) d.x = canvas.width + 20;
    if(d.x > canvas.width + 20) d.x = -20;
    if(d.y < -20) d.y = canvas.height + 20;
    if(d.y > canvas.height + 20) d.y = -20;
    
    cctx.save();
    cctx.translate(d.x, d.y);
    cctx.rotate(d.rot);
    
    // درخشش
    cctx.shadowColor = d.color;
    cctx.shadowBlur = d.r * intensity / 15;
    
    // اندازه با شدت صدا
    const size = d.r * (0.5 + intensity / 100);
    
    cctx.fillStyle = d.color;
    cctx.globalAlpha = d.alpha * (0.5 + intensity / 200);
    
    cctx.beginPath();
    for(let i = 0; i < 4; i++){
      cctx.lineTo(Math.cos(i * Math.PI/2) * size, Math.sin(i * Math.PI/2) * size);
    }
    cctx.closePath();
    cctx.fill();
    
    // خطوط اطراف
    cctx.strokeStyle = d.color;
    cctx.lineWidth = 1;
    cctx.globalAlpha = d.alpha * 0.5;
    cctx.beginPath();
    cctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    cctx.stroke();
    
    cctx.restore();
  });
  
  // ستون‌های فرکانس
  if(ctxA && isPlayingA){
    ctxA.analyser.getByteFrequencyData(ctxA.data);
    const barWidth = (canvas.width / 2) / 20;
    for(let i = 0; i < 20; i++){
      const val = ctxA.data[i];
      const barHeight = (val / 255) * canvas.height * 0.8;
      cctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      cctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
    }
  }
  
  if(ctxB && isPlayingB){
    ctxB.analyser.getByteFrequencyData(ctxB.data);
    const barWidth = (canvas.width / 2) / 20;
    for(let i = 0; i < 20; i++){
      const val = ctxB.data[i];
      const barHeight = (val / 255) * canvas.height * 0.8;
      cctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      cctx.fillRect(canvas.width/2 + i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
    }
  }
}

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
    for(let i = 0; i < 8; i++){
      document.getElementById('dm' + i).classList.add('on');
    }
  } else {
    document.body.style.background = '#0a0a12';
    for(let i = 0; i < 8; i++){
      document.getElementById('dm' + i).classList.remove('on');
    }
  }
  
  drawVisualizer(intensity, bassA, bassB);
  
  if(isPlayingA || isPlayingB){
    requestAnimationFrame(detectBeat);
  }
}
