// Setup basic express server
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const port = process.env.PORT || 8000;

server.listen(port, function() {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static("public"));

// room
let numUsers = 0;

// filter state
const effectsState = {
  filterDelay: {
    x: null,
    y: null
  },
  reverb: {
    x: null,
    y: null
  }
};

const djs = {
  nick: null,
  kingen: null
};

const djToEffect = {
  nick: "filterDelay",
  kingen: "reverb"
};

const findDjById = id => Object.keys(djs).find(key => djs[key] === id);

io.on("connection", function(socket) {
  // request comes in
  // if we know client
  // then dont increment this thing

  let djId = socket.handshake.query.djId;
  let currentDj = findDjById(socket.handshake.query.djId);

  if (!currentDj) {
    const availableSlots = Object.keys(djs).filter(key => {
      return !djs[key];
    });

    currentDj = availableSlots[0];
    djs[currentDj] = socket.id;
    djId = socket.id;
  }

  socket.handshake.query.djId = djId;
  socket.emit("dj_assigned", {
    name: currentDj,
    djId
  });

  // echo globally (all clients) that a person has connected
  socket.broadcast.emit("user joined", {
    numUsers: numUsers
  });

  // when the client emits 'new message', this listens and executes
  socket.on("coordinate_update", function(data) {
    const currentDj = findDjById(data.djId);
    const effectName = djToEffect[currentDj];
    effectsState[effectName] = {
      x: data.x,
      y: data.y
    };
    io.emit("coordinate_update", effectsState);
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function() {
    console.log(socket.handshake.query.djId);
    const currentDj = findDjById(socket.handshake.query.djId);
    djs[currentDj] = null;
  });
});
