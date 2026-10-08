const socket = io();

const selectedEmpire = sessionStorage.getItem("empire") || "ottoman";
document.body.dataset.empire = selectedEmpire;

const bgm = document.getElementById("bg-music");
if (bgm) {
  // same track the select page was playing
  bgm.src = "assets/music/" + selectedEmpire + ".mp3";

  // jump to the saved position once the file is ready
  bgm.addEventListener("loadedmetadata", () => {
    bgm.currentTime = Number(sessionStorage.getItem("bgm-time")) || 0;
  }, { once: true });

  bgm.play().catch(() => {
    // browser blocked autoplay: start on the first click or key press
    const resume = () => bgm.play();
    window.addEventListener("click", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
  });

  // keep saving the position for the next page
  setInterval(() => sessionStorage.setItem("bgm-time", bgm.currentTime), 500);
}

const empireAvatars = {
  ottoman: "assets/images/avatars/avatar-sultan.png",
  roman: "assets/images/avatars/avatar-roman.png",
  carthaginian: "assets/images/avatars/avatar-carthage.png",
  egyptian: "assets/images/avatars/avatar-egyptian.png",
  andalus: "assets/images/avatars/avatar-andalus.png"
};

const profileImg = document.querySelector(".profile img:first-child");
if (profileImg && empireAvatars[selectedEmpire]) {
  profileImg.src = empireAvatars[selectedEmpire];
}

let playerId = sessionStorage.getItem("playerId");
if (!playerId) {
  playerId = crypto.randomUUID();
  sessionStorage.setItem("playerId", playerId);
}
const myEmpire = selectedEmpire;

const listEl = document.getElementById("lobby-list");
const emptyEl = document.getElementById("lobby-empty");
const statusEl = document.getElementById("lobby-status");
const createBtn = document.getElementById("lobby-create");
const cancelBtn = document.getElementById("lobby-cancel");
const lobbyNameInput = document.getElementById("lobby-name");

createBtn.addEventListener("click", () => {
  const name = lobbyNameInput.value.trim();
  if (!name) {
    statusEl.textContent = "Enter a lobby name first.";
    return;
  }
  socket.emit("createLobby", { name, empire: myEmpire, playerId });
});

cancelBtn.addEventListener("click", () => {
  socket.emit("cancelLobby");
  statusEl.textContent = "";
  createBtn.hidden = false;
  cancelBtn.hidden = true;
});

socket.on("lobbyCreated", () => {
  statusEl.textContent = "Waiting for an opponent...";
  createBtn.hidden = true;
  cancelBtn.hidden = false;
});

socket.on("lobbies", (lobbies) => {
  listEl.innerHTML = "";
  emptyEl.hidden = lobbies.length > 0;

  lobbies.forEach((l) => {
    const li = document.createElement("li");
    li.className = "lobby-row";

    const player = document.createElement("div");
    player.className = "lobby-player";

    const avatar = document.createElement("img");
    avatar.className = "lobby-avatar";
    avatar.src = empireAvatars[l.empire] || empireAvatars.ottoman;
    avatar.alt = (l.empire || "Empire") + " avatar";

    const details = document.createElement("div");
    details.className = "lobby-details";

    const name = document.createElement("strong");
    name.textContent = l.name;

    const empire = document.createElement("span");
    empire.textContent = l.empire ? l.empire.charAt(0).toUpperCase() + l.empire.slice(1) : "Unknown empire";

    details.append(name, empire);
    player.append(avatar, details);

    const presence = document.createElement("div");
    presence.className = "lobby-presence";

    const waiting = document.createElement("span");
    waiting.className = "lobby-waiting";
    waiting.textContent = "Waiting for an opponent";

    const playerCount = document.createElement("span");
    playerCount.className = "lobby-player-count";
    playerCount.textContent = "1/2";
    presence.append(waiting, playerCount);

    const btn = document.createElement("button");
    btn.className = "lobby-join";
    btn.textContent = "Join";
    btn.addEventListener("click", () => {
      socket.emit("joinLobby", { id: l.id, empire: myEmpire, playerId });
    });

    li.append(player, presence, btn);
    listEl.appendChild(li);
  });
});

socket.on("gameStart", ({ gameId }) => {
  sessionStorage.setItem("gameId", gameId);
  sessionStorage.removeItem("showBattleIntro");
  document.body.dataset.empire = selectedEmpire;
  startBattleIntro();
});

socket.on("errorMsg", (msg) => alert(msg));

const quote    = document.getElementById("quote-audio");
const startAudio = document.getElementById("start-audio");
const introOverlay  = document.getElementById("intro-overlay");
const countEl  = document.getElementById("intro-count");
let introStarted = false;

function fadeOut(audio, duration) {
  if (!audio) return Promise.resolve();

  return new Promise((resolve) => {
    const step = audio.volume / (duration / 50);
    const timer = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - step);
      if (audio.volume === 0) {
        audio.pause();
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

function playQuote() {
  if (!quote) return Promise.resolve();

  return new Promise(resolve => {
    const finish = () => resolve();
    quote.addEventListener("ended", finish, { once: true });
    quote.addEventListener("error", finish, { once: true });
    quote.play().catch(finish);
  });
}

function playStartAudio() {
  if (!startAudio) return Promise.resolve();

  startAudio.currentTime = 0;
  return new Promise(resolve => {
    const finish = () => resolve();
    startAudio.addEventListener("ended", finish, { once: true });
    startAudio.addEventListener("error", finish, { once: true });
    startAudio.play().catch(finish);
  });
}

function countdown() {
  let n = 3;
  if (!countEl) return Promise.resolve();
  countEl.textContent = n;

  return new Promise(resolve => {
    const timer = setInterval(() => {
      n--;
      if (n > 0) {
        countEl.textContent = n;
      } else {
        clearInterval(timer);
        countEl.textContent = "";
        resolve();
      }
    }, 1000);
  });
}

async function startBattleIntro() {
  if (introStarted) return;
  introStarted = true;

  if (!introOverlay) {
    window.location.href = "game.html";
    return;
  }

  const quotes = {
    ottoman: "assets/music/quote-ottoman.mp3",
    roman: "assets/music/quote-roman.mp3",
    carthaginian: "assets/music/quote-carthaginian.mp3",
    egyptian: "assets/music/quote-egyptian.mp3",
    andalus: "assets/music/quote-andalus.mp3"
  };
  if (quote && quotes[selectedEmpire]) quote.src = quotes[selectedEmpire];

  introOverlay.classList.remove("leaving");
  introOverlay.classList.add("show");

  const countdownFinished = countdown();
  const quoteFinished = playQuote();
  playStartAudio();
  fadeOut(startAudio, 5000);
  fadeOut(bgm, 3000);
  await Promise.all([countdownFinished, quoteFinished]);

  sessionStorage.setItem("fadeBattleIntroOnGame", "1");
  window.location.href = "game.html";
}