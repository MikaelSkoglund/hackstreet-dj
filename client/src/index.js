import "./styles/main.scss";

import io from "socket.io-client";
import pixi from "pixi.js";

const verticalLabel = document.getElementById("verticalLabel");
const horizontalLabel = document.getElementById("horizontalLabel");
const canvas = document.getElementById("surface");

const video = document.querySelector(".video");

if (window.innerWidth > window.innerHeight) {
  video.width = window.innerWidth;
  video.height = (window.innerWidth * 9) / 16;
} else {
  video.height = window.innerHeight;
  video.width = (16 / 9) * window.innerHeight;
}

const app = new PIXI.Application({
  view: canvas,
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true
});
document.body.appendChild(app.view);

// canvas.width = window.innerWidth;
// canvas.height = window.innerHeight;

const state = {
  dj: null,
  effect: null,
  effects: { filterDelay: null, reverb: null }
};

const effectText = {
  filterDelay: {
    x: "Filter",
    y: "Delay"
  },
  reverb: {
    x: "Reverb",
    y: null
  }
};

const setState = newState => {
  Object.assign(state, newState);

  if (effectText[state.effect].y)
    verticalLabel.innerHTML = "👈 " + effectText[state.effect].y;

  if (effectText[state.effect].x)
    horizontalLabel.innerHTML = effectText[state.effect].x + " 👉";
};

const socket = io("http://178.62.77.148/socket", {
  query: { djId: sessionStorage.getItem("djId") }
});

socket.on("dj_assigned", data => {
  sessionStorage.setItem("djId", data.djId);
  console.log(data);
  setState({
    currentDj: data.currentDj,
    effect: data.effect
  });
});

window.addEventListener("mousemove", e => {
  const y = e.clientY / canvas.clientHeight;
  const x = e.clientX / canvas.clientWidth;

  socket.emit("coordinate_update", {
    djId: sessionStorage.getItem("djId"),
    x,
    y
  });
});

window.addEventListener("touchmove", e => {
  const y = e.touches[0].clientY / canvas.clientHeight;
  const x = e.touches[0].clientX / canvas.clientWidth;

  socket.emit("coordinate_update", {
    djId: sessionStorage.getItem("djId"),
    x,
    y
  });
});

window.addEventListener("touchend", e => {
  socket.emit("coordinate_update", {
    djId: sessionStorage.getItem("djId"),
    x: 0,
    y: 0
  });
});

window.onclick = () => {
  const audioCtx = new AudioContext();
  window.reverbjs.extend(audioCtx);
  const bufferSource = audioCtx.createBufferSource();

  //Filter 1
  const filterNode = audioCtx.createBiquadFilter();
  const delayNode = audioCtx.createDelay(5.0);
  const delayGainNode = audioCtx.createGain();
  delayNode.delayTime.value = 140 / 60 / 4;

  bufferSource.connect(filterNode);

  filterNode.connect(audioCtx.destination);
  filterNode.connect(delayGainNode);
  delayGainNode.connect(delayNode);
  filterNode.frequency.value = 0;

  filterNode.type = "highpass";

  delayNode.connect(audioCtx.destination);

  // Filter 2
  const reverbUrl = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a";
  const reverbNode = audioCtx.createReverbFromUrl(reverbUrl, function() {
    reverbNode.connect(audioCtx.destination);
  });
  const reverbGainNode = audioCtx.createGain();
  filterNode.connect(reverbGainNode);
  reverbGainNode.gain.value = 0;
  reverbGainNode.connect(reverbNode);

  const fileLoc = "/hackstreet-3.mp3";
  fetch(fileLoc)
    .then(response => response.arrayBuffer())
    .then(buffer =>
      audioCtx.decodeAudioData(buffer, data => {
        bufferSource.buffer = data;
        bufferSource.start();
      })
    );

  socket.on("connect", () => {});

  socket.on("coordinate_update", data => {
    setState({
      effects: data
    });

    const frequency = Math.floor(
      (data.filterDelay.x * audioCtx.sampleRate) / 4
    );

    const delay = data.filterDelay.y;

    filterNode.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    delayGainNode.gain.setValueAtTime(delay, audioCtx.currentTime);
    reverbGainNode.gain.setValueAtTime(data.reverb.x, audioCtx.currentTime);
  });
};

const sprites = Object.keys(state.effects).map(key => {
  const effect = state.effects[key];
  return createSprite(key);
});

const render = () => {
  sprites.forEach(sprite => {
    const effect = state.effects[sprite.name];
    if (effect) {
      sprite.x = effect.x * canvas.clientWidth;
      sprite.y = effect.y * canvas.clientHeight;
    }
  });
};

app.ticker.add(render);

function createSprite(name) {
  const sprite = new PIXI.Graphics();

  console.log(sprite);

  sprite.name = name;
  sprite.beginFill(0xde3249, 1);
  sprite.drawCircle(0, 0, 20);
  sprite.endFill();

  // sprite.anchor.set(0.5);
  // sprite.scale.set(1);

  app.stage.addChild(sprite);

  return sprite;
}
