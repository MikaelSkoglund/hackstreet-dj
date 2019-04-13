import "./styles/main.scss";

import io from "socket.io";

const socket = io();
const canvas = document.querySelector("#surface");

canvas.addEventListener("mousemove", e => {
  const y = e.clientY / canvas.clientHeight;
  const x = e.clientX / canvas.clientWidth;

  console.log(y);
  console.log(x);
});
