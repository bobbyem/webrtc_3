import {
  createMemberElement,
  findMemberVideoElement,
  handleSelectVideo,
  hasShareScreenSupport,
  hasWebCamSupport,
  removeDeadMembersElements,
  shareCamera,
  updateMembersDisplay,
  updateSocketIdDisplay,
} from "./utils.js";

const iceServer = {
  iceServers: [
    {
      urls: "stun:a.relay.metered.ca:80",
    },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "cc347fe19af50ac013cb7699",
      credential: "4UOGvKP33Mduvlmf",
    },
    // {
    //   urls: "turn:a.relay.metered.ca:80?transport=tcp",
    //   username: "cc347fe19af50ac013cb7699",
    //   credential: "4UOGvKP33Mduvlmf",
    // },
    // {
    //   urls: "turn:a.relay.metered.ca:443",
    //   username: "cc347fe19af50ac013cb7699",
    //   credential: "4UOGvKP33Mduvlmf",
    // },
    // {
    //   urls: "turn:a.relay.metered.ca:443?transport=tcp",
    //   username: "cc347fe19af50ac013cb7699",
    //   credential: "4UOGvKP33Mduvlmf",
    // },
  ],
};

// const socket = io("http://localhost:3000");
const socket = io("https://webrct.onrender.com");

export const STATE = {
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
  console.log("🚀 ~ file: main.js:63 ~ handleMembers ~ members:", members);
  STATE.connections = STATE.connections.filter((connection) =>
    members.includes(connection.socketId)
  );

  await members.map(async (member) => {
    const { connections } = STATE;
    if (connections.find((connection) => connection.socketId === member))
      return;

    const newConnection = {
      socketId: member,
      pc: await new RTCPeerConnection(iceServer),
    };

    newConnection.pc.ontrack = (event) => {
      if (member === STATE.mySocketId) return;
      console.log("🚀 ~ file: main.js:88 ~ ontrack ~ event:", event);
      const memberVideo = findMemberVideoElement(member);
      memberVideo.srcObject = event.streams[0];
    };

    newConnection.pc.onicecandidate = (event) => {
      if (member === STATE.mySocketId) return;
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
      if (member === STATE.mySocketId) return;
      console.log(
        "🚀 ~ file: main.js:36 ~ onnegotiationneeded ~ event:",
        event
      );
      sendOffer({ pc: newConnection.pc, socketId: newConnection.socketId });
    };

    newConnection.onconnectionstatechange = (event) => {
      debugger;
      console.log(
        "🚀 ~ file: main.js:110 ~ oniceconnectionstatechange ~ event:",
        event
      );
      if (newConnection.iceConnectionState === "disconnected") {
      }
    };

    if (STATE.localStream) {
      const track = STATE.localStream.getTracks()[0];
      console.log("🚀 ~ file: main.js:120 ~ awaitmembers.map ~ track:", track);

      newConnection.pc.addTrack(track, STATE.localStream);
    }

    STATE.connections.push(newConnection);
  });

  updateDisplay(STATE.connections);
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
  console.log(
    "🚀 ~ file: main.js:180 ~ updateDisplay ~ connections:",
    connections
  );

  removeDeadMembersElements(connections);

  updateMembersDisplay(connections);
  // connections.map((connection) => {
  //   const memberElement = createMemberElement(connection.socketId);
  //   memberDisplay?.appendChild(memberElement);
  // });
}

async function shareScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    STATE.localStream = stream;

    const myVideo = findMemberVideoElement(STATE.mySocketId);
    console.log("🚀 ~ file: main.js:216 ~ shareScreen ~ myVideo:", myVideo);

    myVideo.srcObject = stream;

    STATE.connections.forEach((connection) => {
      if (connection.pc) {
        connection.pc.addTrack(stream.getTracks()[0], stream);
      }
    });
  } catch (err) {
    console.error(`Error: ${err}`);
  }
}

async function init() {
  const screen = hasShareScreenSupport();
  if (!screen) {
    alert("Your browser does not support screen sharing");
    document.getElementById("shareScreen").disabled = true;
    return;
  }
  const webcam = await hasWebCamSupport();
  if (!webcam) {
    alert("Your browser does not seem to support webcam");
    document.getElementById("shareCam").disabled = true;
    return;
  }
}

document.querySelector("#shareScreen")?.addEventListener("click", shareScreen);
document.querySelector("#shareCam")?.addEventListener("click", shareCamera);

socket.on("connect", () => {
  socket.emit("joinRoom", STATE.roomId);
});
socket.on("offer", (payload) => handleOffer(payload));
socket.on("answer", (payload) => handleAnswer(payload));
socket.on("candidate", (payload) => handleCandidate(payload));
socket.on("members", (members) => handleMembers(members));
socket.on("socketId", (socketId) => {
  STATE.mySocketId = socketId;
  updateSocketIdDisplay(STATE.mySocketId);
});
socket.on("connect_error", (err) => {
  console.log(`connect_error due to ${err.message}`);
});

init();
