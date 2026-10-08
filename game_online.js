const socket = io();
const playerId = sessionStorage.getItem("playerId");
const gameId = sessionStorage.getItem("gameId");
const quote = document.getElementById("quote-audio");
const introOverlay = document.getElementById("intro-overlay");
const introCount = document.getElementById("intro-count");
const startAudio = document.getElementById("start-audio");
const fadeBattleIntroOnGame = sessionStorage.getItem("fadeBattleIntroOnGame") === "1";
const selectedEmpire = sessionStorage.getItem("empire") || localStorage.getItem("selectedEmpire") || "ottoman";

document.body.dataset.empire = selectedEmpire;

if (fadeBattleIntroOnGame && introOverlay) {
  introOverlay.classList.add("show");
}

function fadeOut(audio, duration) {
  if (!audio) return;
  const step = audio.volume / (duration / 50);
  const timer = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume === 0) {
      audio.pause();
      clearInterval(timer);
    }
  }, 50);
}

function playQuote() {
  if (!quote) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => resolve();
    quote.addEventListener("ended", finish, { once: true });
    quote.addEventListener("error", finish, { once: true });
    quote.play().catch(finish);
  });
}

function startBattleIntro() {
  if (!introOverlay) return;

  const themeMap = {
    ottoman: "assets/music/quote-ottoman.mp3",
    roman: "assets/music/quote-roman.mp3",
    carthaginian: "assets/music/quote-carthaginian.mp3",
    egyptian: "assets/music/quote-egyptian.mp3",
    andalus: "assets/music/quote-andalus.mp3"
  };

  if (quote && themeMap[selectedEmpire]) {
    quote.src = themeMap[selectedEmpire];
  }

  introOverlay.classList.remove("leaving");
  introOverlay.classList.add("show");

  let n = 3;
  introCount.textContent = n;
  introCount.classList.remove("pop");
  void introCount.offsetWidth;
  introCount.classList.add("pop");

  const countdownDone = new Promise((resolve) => {
    const timer = setInterval(() => {
      n--;
      if (n > 0) {
        introCount.textContent = n;
        introCount.classList.remove("pop");
        void introCount.offsetWidth;
        introCount.classList.add("pop");
      } else {
        clearInterval(timer);
        introCount.textContent = "";
        resolve();
      }
    }, 1000);
  });

  const quoteFinished = playQuote();

  if (startAudio) {
    startAudio.currentTime = 0;
    startAudio.play().catch(() => {});
    fadeOut(startAudio, 5000);
  }

  Promise.all([countdownDone, quoteFinished]).then(() => {
    introOverlay.classList.add("leaving");
    setTimeout(() => {
      introOverlay.classList.remove("show");
      sessionStorage.removeItem("showBattleIntro");
    }, 700);
  });
}

socket.emit("joinGame", { gameId, playerId });

socket.on("gameJoined", ({ color, white, black }) => {
  // you now know your color and both empires:
  // apply the themes, flip the board if color === "black", etc.
  console.log("I am", color, "| white:", white, "| black:", black);

  if (fadeBattleIntroOnGame && introOverlay) {
    sessionStorage.removeItem("fadeBattleIntroOnGame");
    setTimeout(() => {
      introOverlay.classList.add("leaving");
      setTimeout(() => introOverlay.classList.remove("show", "leaving"), 700);
    }, 150);
  }

  if (sessionStorage.getItem("showBattleIntro") === "1") {
    setTimeout(startBattleIntro, 200);
  }
});

socket.on("opponentDisconnected", () => console.log("opponent left"));
socket.on("errorMsg", (msg) => alert(msg));


