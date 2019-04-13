import "./styles/main.scss";

import io from "socket.io-client";

window.onclick = () => {
  const audioCtx = new AudioContext();
  const bufferSource = audioCtx.createBufferSource();
  const filterNode = audioCtx.createBiquadFilter();
  const delayNode = audioCtx.createDelay(5.0);
  const delayGainNode = audioCtx.createGain();
  delayNode.delayTime.value = 148 / 60 / 2;

  bufferSource.connect(filterNode);

  filterNode.connect(audioCtx.destination);
  filterNode.connect(delayGainNode);
  delayGainNode.connect(delayNode);
  filterNode.frequency.value = audioCtx.sampleRate / 2;

  delayNode.connect(audioCtx.destination);
  console.log(delayNode);

  const fileLoc = "/hackstreet-2.mp3";
  fetch(fileLoc)
    .then(response => response.arrayBuffer())
    .then(buffer =>
      audioCtx.decodeAudioData(buffer, data => {
        bufferSource.buffer = data;
        bufferSource.start();
      })
    );

  const socket = io("http://localhost:8000", {
    query: { djId: sessionStorage.getItem("djId") }
  });

  socket.on("connect", () => {});

  const state = {
    dj: null
  };

  const setState = newState => {
    Object.assign(state, newState);
    console.log(newState);
  };

  socket.on("dj_assigned", data => {
    sessionStorage.setItem("djId", data.djId);
  });

  socket.on("coordinate_update", data => {
    const frequency = Math.floor(
      (data.filterDelay.x * audioCtx.sampleRate) / 2
    );

    const delay = data.filterDelay.y;

    filterNode.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    delayGainNode.gain.setValueAtTime(delay, audioCtx.currentTime);
  });

  const canvas = document.querySelector("#surface");

  canvas.addEventListener("mousemove", e => {
    const y = e.clientY / canvas.clientHeight;
    const x = e.clientX / canvas.clientWidth;

    socket.emit("coordinate_update", {
      djId: sessionStorage.getItem("djId"),
      x,
      y
    });
  });
};
