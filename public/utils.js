import { STATE } from "./main.js";

export function createMemberElement(id) {
  console.log("🚀 ~ file: utils.js:2 createMemberElement id:", id);

  const memberElement = document.createElement("div");
  memberElement.classList.add("memberContainer");
  memberElement.id = id;

  const videoElement = document.createElement("video");
  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.controls = false;
  memberElement.appendChild(videoElement);

  const memberId = document.createElement("p");
  memberId.textContent = id;
  memberElement.appendChild(memberId);

  memberElement.addEventListener("click", handleSelectVideo);

  return memberElement;
}

export function findMemberVideoElement(id) {
  console.log("🚀 ~ file: utils.js:31 ~ findMemberVideoElement ~ id:", id);
  const memberElement = document.getElementById(id);
  const videoElement = memberElement.querySelector("video");
  console.log(
    "🚀 ~ file: utils.js:33 ~ findMemberVideoElement ~ videoElement:",
    videoElement
  );
  return videoElement;
}

export function handleSelectVideo(event) {
  const primaryVideoElement = document.getElementById("primaryVideoWindow");
  const { target } = event;
  if (target.tagName === "VIDEO" && target.srcObject) {
    primaryVideoElement.srcObject = target.srcObject;
    const parent = target.parentNode;
    deselectAll();
    parent.classList.add("selected");
  }
}

export function removeDeadMembersElements(connections) {
  console.log(
    "🚀 ~ file: utils.js:45 ~ removeDeadMembersElements ~ connections:",
    connections
  );
  const membersDisplay = document.getElementById("membersDisplay");
  console.log(
    "🚀 ~ file: utils.js:47 ~ removeDeadMembersElements ~ membersDisplay:",
    membersDisplay
  );
  Array.from(membersDisplay.children).forEach((memberElement) => {
    if (
      !connections
        .map((connection) => connection.socketId)
        .includes(memberElement.id)
    ) {
      console.log(
        "🚀 ~ file: utils.js:49 ~ removeDeadMembersElements ~ memberElement:",
        memberElement
      );
      memberElement.remove();
    }
  });
}

export function updateMembersDisplay(connections) {
  console.log(
    "🚀 ~ file: utils.js:55 ~ updateMembersDisplay ~ connections:",
    connections
  );
  const membersDisplay = document.getElementById("membersDisplay");

  connections.map((connection) => {
    let memberElement = document.getElementById(connection.socketId);
    if (memberElement) return;
    memberElement = createMemberElement(connection.socketId);
    membersDisplay.appendChild(memberElement);
  });
}

export function updateSocketIdDisplay(socketId) {
  const socketIdDisplay = document.getElementById("socketIdDisplay");
  socketIdDisplay.textContent = socketId;
}

export async function shareCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  if (stream) {
    alert("Should share your camera");
    STATE.localStream = stream;
    STATE.connections.forEach((connection) => {
      if (connection.pc) {
        connection.pc.addTrack(stream.getTracks()[0], stream);
      }
    });
  }
}

function deselectAll() {
  const selected = document.getElementsByClassName("selected");
  for (let i = 0; i < selected.length; i++) {
    selected[i].classList.remove("selected");
  }
}

export function hasShareScreenSupport() {
  return navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
}

export async function hasWebCamSupport() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === "videoinput");
  return videoInputs.length > 0;
}
