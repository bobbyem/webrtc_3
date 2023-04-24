const iceServer = {
  urls: [
    "stun.freecall.com:3478",
    "stun.freeswitch.org:3478",
    "stun.freevoipdeal.com:3478",
    "stun.gmx.de:3478",
    "stun.gmx.net:3478",
    "stun.gradwell.com:3478",
    "stun.halonet.pl:3478",
    "stun.hellonanu.com:3478",
    "stun.hoiio.com:3478",
    "stun.hosteurope.de:3478",
    "stun.ideasip.com:3478",
  ],
};

// const socket = io("http://localhost:3000");
const socket = io("https://webrct.onrender.com");

const STATE = {
  connections: [],
  localStream: null,
  mySocketId: null,
  pc: null,
  roomId: "test",
};

async function call(connection) {
  if (!socket && !connection) {
    return alert("socket: ", socket, "connection: ", connection);
  }

  const { socketId, pc } = connection;

  sendOffer({ pc, socketId });
}

//Create offer
function sendOffer({ pc, socketId }) {
  const offer = pc
    .createOffer({ offerToReceiveVideo: true })
    .then((offer) => {
      return pc.setLocalDescription(offer);
    })
    .then(() => {
      const payload = {
        target: socketId,
        offer: pc.localDescription,
        sender: STATE.mySocketId,
      };
      socket.emit("offer", payload);
    })
    .catch((error) => console.error(error));
}

async function handleMembers(members) {
  updateDisplay();
  console.log("🚀 ~ file: main.js:55 ~ handleMembers ~ members:", members);
  STATE.connections = STATE.connections.filter((connection) =>
    members.includes(connection.socketId)
  );

  members.map(async (member) => {
    const { connections } = STATE;
    if (
      connections.find((connection) => connection.socketId === member) ||
      member === STATE.mySocketId
    )
      return;

    const newConnection = {
      socketId: member,
      pc: await new RTCPeerConnection(iceServer),
    };

    newConnection.pc.ontrack = (event) => {
      console.log("🚀 ~ file: main.js:88 ~ ontrack ~ event:", event);
      document.querySelector("#remoteVideo").srcObject = event.streams[0];

      const idDisplayElement = document.createElement("p");
      idDisplayElement.textContent = member;
      const remoteVideoElement = document.querySelector("#remoteVideo");
      idDisplayElement.style.position = "absolute";
      idDisplayElement.style.top = remoteVideoElement.offsetTop + "px";
      idDisplayElement.style.left = remoteVideoElement.offsetLeft + "px";
      idDisplayElement.className = "overlay";
      document.body.appendChild(idDisplayElement);
    };

    newConnection.pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload = {
        target: newConnection.socketId,
        candidate: event.candidate,
        sender: STATE.mySocketId,
      };
      console.log("🚀 ~ file: main.js:58 ~ call ~ payload:", payload);
      socket.emit("candidate", payload);
    };

    newConnection.pc.onnegotiationneeded = (event) => {
      console.log(
        "🚀 ~ file: main.js:36 ~ onnegotiationneeded ~ event:",
        event
      );
      sendOffer({ pc: newConnection.pc, socketId: newConnection.socketId });
    };

    STATE.connections.push(newConnection);
    updateDisplay(STATE.connections);
  });
}

function handleOffer(payload) {
  console.log("🚀 ~ file: main.js:86 ~ handleOffer ~ payload:", payload);
  const { target, sender, offer } = payload;

  const connection = STATE.connections.find((con) => con.socketId === sender);

  if (!connection) return;

  const { pc, socketId } = connection;

  pc.setRemoteDescription(offer)
    .then(() => {
      const answer = pc.createAnswer();
      return pc.setLocalDescription(answer);
    })
    .then(() => {
      const payload = {
        target: sender,
        answer: pc.localDescription,
        sender: STATE.mySocketId,
      };
      console.log(
        "🚀 ~ file: main.js:106 ~ setRemoteDescription ~ payload:",
        payload
      );
      socket.emit("answer", payload);
    })
    .catch((error) => console.error(error));
}

function handleAnswer(payload) {
  console.log("🚀 ~ file: main.js:115 ~ handleAnswer ~ payload:", payload);
  const { target, sender, answer } = payload;

  const connection = STATE.connections.find((con) => con.socketId === sender);

  if (!connection) return;

  const { pc, socketId } = connection;

  pc.setRemoteDescription(answer)
    .then(() => {
      console.log(pc);
      return;
    })
    .catch((error) => console.error(error));
}

function handleCandidate(payload) {
  console.log("🚀 ~ file: main.js:141 ~ handleCandidate ~ payload:", payload);
  const { target, sender, candidate } = payload;

  const connection = STATE.connections.find((con) => con.socketId === sender);

  if (!connection) return;

  const { pc, socketId } = connection;

  pc.addIceCandidate(candidate)
    .then(() => {
      console.log(pc);
      return;
    })
    .catch((error) => console.error(error));
}

function updateDisplay(connections) {
  const memberDisplay = document.querySelector("#membersDisplay");
  if (!connections) return (membersDisplay.innerHTML = "");
  if (memberDisplay) memberDisplay.innerHTML = "";

  connections.forEach((connection) => {
    const memberItem = document.createElement("div");
    const paragraph = document.createElement("p");
    const callBtn = document.createElement("button");
    /* ------------------------------- add content ------------------------------ */
    memberItem.id = connection.socketId;
    paragraph.textContent = connection.socketId;
    callBtn.textContent = "Call";

    /* ----------------------------- button listener ---------------------------- */
    callBtn.addEventListener("click", () => call(connection));

    /* --------------------------------- append --------------------------------- */
    memberItem.appendChild(callBtn);
    memberItem.appendChild(paragraph);
    memberDisplay?.appendChild(memberItem);
  });
}

async function shareScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    STATE.localStream = stream;

    document.querySelector("#localVideo").srcObject = stream;

    STATE.connections.forEach((connection) => {
      if (connection.pc) {
        connection.pc.addTrack(stream.getTracks()[0], stream);
      }
    });
  } catch (err) {
    console.error(`Error: ${err}`);
  }
}

document.querySelector("#share")?.addEventListener("click", shareScreen);

socket.on("connect", () => {
  socket.emit("joinRoom", STATE.roomId);
});
socket.on("offer", (payload) => handleOffer(payload));
socket.on("answer", (payload) => handleAnswer(payload));
socket.on("candidate", (payload) => handleCandidate(payload));
socket.on("members", (members) => handleMembers(members));
socket.on("socketId", (socketId) => (STATE.mySocketId = socketId));
socket.on("connect_error", (err) => {
  console.log(`connect_error due to ${err.message}`);
});
