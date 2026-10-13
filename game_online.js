const socket = io();
const playerId = sessionStorage.getItem("playerId");
const gameId = sessionStorage.getItem("gameId");
const quote = document.getElementById("quote-audio");
const introOverlay = document.getElementById("intro-overlay");
const introCount = document.getElementById("intro-count");
const startAudio = document.getElementById("start-audio");
const fadeBattleIntroOnGame = sessionStorage.getItem("fadeBattleIntroOnGame") === "1";
const selectedEmpire = sessionStorage.getItem("empire") || localStorage.getItem("selectedEmpire") || "ottoman";
let myColor = "white";
let currentState = null;     // the last gameState from the server
let selectedSquare = null;   // e.g. "e2", or null
let ottomanAbilityMode = false;
const empireNames = {
  ottoman: "Ottoman",
  roman: "Roman",
  carthaginian: "Carthaginian",
  egyptian: "Egyptian",
  andalus: "Andalus"
};

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
  myColor = color;
  const playerEmpire = color === "white" ? white : black;
  const opponentEmpire = color === "white" ? black : white;
  document.getElementById("ottoman-ability-control").hidden = playerEmpire !== "ottoman";
  applyGameVisuals(playerEmpire, opponentEmpire);
  const playerName = document.getElementById("player-name");
  const opponentName = document.getElementById("opponent-name");
  if (playerName) playerName.textContent = empireNames[playerEmpire] || playerEmpire;
  if (opponentName) opponentName.textContent = empireNames[opponentEmpire] || opponentEmpire;
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

const chessBoardOverlay = document.querySelector('.array-chess-board');
const ottomanAbilityButton = document.getElementById("ottoman-ability-btn");
const moveSound = new Audio("assets/music/move-self.mp3");
const captureSound = new Audio("assets/music/capture.mp3");
const abilitySound = new Audio("assets/music/start.mp3");
const ottomanAbilitySound = new Audio("assets/abilities/ottoman.mp3");
const abilitySounds = [abilitySound, ottomanAbilitySound];
const abilityBannerDuration = 3200;
let abilitySoundFadeTimer = null;
let abilitySoundFadeFrame = null;

const files = "abcdefgh";
const pieceNames = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

// "rnbqkbnr/pppppppp/8/..." -> 8x8 array of letters or null
function fenToBoard(fen) {
  return fen.split(" ")[0].split("/").map((rowText) => {
    const row = [];
    for (const ch of rowText) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) row.push(null);
      } else {
        row.push(ch);
      }
    }
    return row;
  });
}

function renderBoard(fen, myColor = "white") {
  chessBoardOverlay.innerHTML = "";
  const board = fenToBoard(fen);

  for (let i = 0; i < 64; i++) {
    let row = Math.floor(i / 8);
    let col = i % 8;
    if (myColor === "black") {   // flip the board for the black player
      row = 7 - row;
      col = 7 - col;
    }

    const square = document.createElement("div");
    square.classList.add((row + col) % 2 === 0 ? "light-square" : "dark-square");
    square.dataset.square = files[col] + (8 - row);   // "e4", "a1", ...

    const letter = board[row][col];
    if (letter) {
      const color = letter === letter.toUpperCase() ? "white" : "black";
      const type = pieceNames[letter.toLowerCase()];

      const piece = document.createElement("img");
      piece.className = `chess-piece ${color}-piece`;
      piece.src = `assets/images/pieces/pieces/${color}/${color[0]}${type}.png`;
      piece.alt = `${color} ${type}`;
      piece.draggable = false;
      square.appendChild(piece);
    }

    chessBoardOverlay.appendChild(square);
  }
}

renderBoard(START_FEN);

socket.on("gameState", (state) => {
  const positionChanged = currentState && currentState.fen !== state.fen;
  currentState = state;
  selectedSquare = null;
  renderBoard(state.fen, myColor);
  if (ottomanAbilityMode && (!state.ottomanAbilityAvailable || state.turn !== myColor)) {
    ottomanAbilityMode = false;
  }
  updateOttomanAbilityButton();
  if (positionChanged && state.lastMove && !state.lastMove.ability) {
    const sound = state.lastMove.captured ? captureSound : moveSound;
    sound.currentTime = 0;
    sound.play().catch(() => {});
    slidePiece(state.lastMove.from, state.lastMove.to);
  }
});

function showSelection() {
  chessBoardOverlay.querySelectorAll(".selected, .move-target, .capture")
  .forEach((el) => el.classList.remove("selected", "move-target", "capture"));
  chessBoardOverlay.querySelectorAll(".ability-rook, .ability-target")
    .forEach((el) => el.classList.remove("ability-rook", "ability-target"));
  chessBoardOverlay.querySelectorAll(".selected, .move-target")
    .forEach((el) => el.classList.remove("selected", "move-target"));

  if (ottomanAbilityMode) {
    const abilityTargets = currentState.ottomanAbilityTargets || {};
    Object.keys(abilityTargets).forEach((square) => {
      chessBoardOverlay.querySelector(`[data-square="${square}"]`).classList.add("ability-rook");
    });
    if (selectedSquare && abilityTargets[selectedSquare]) {
      chessBoardOverlay.querySelector(`[data-square="${selectedSquare}"]`).classList.add("selected");
      abilityTargets[selectedSquare].forEach((square) => {
        chessBoardOverlay.querySelector(`[data-square="${square}"]`).classList.add("ability-target");
      });
    }
    return;
  }

  if (!selectedSquare) return;

  chessBoardOverlay.querySelector(`[data-square="${selectedSquare}"]`).classList.add("selected");
  for (const to of currentState.legalMoves[selectedSquare]) {
    const targetEl = chessBoardOverlay.querySelector(`[data-square="${to}"]`);
    targetEl.classList.add("move-target");
    if (targetEl.querySelector(".chess-piece")) {   // a piece stands there: it's a capture
      targetEl.classList.add("capture");
    }
  }
}

function updateOttomanAbilityButton() {
  const available = currentState?.ottomanAbilityAvailable && currentState.turn === myColor;
  const usesRemaining = currentState?.ottomanAbilityUsesRemaining ?? 0;
  ottomanAbilityButton.disabled = !available && !ottomanAbilityMode;
  ottomanAbilityButton.classList.toggle("active", ottomanAbilityMode);
  ottomanAbilityButton.textContent = ottomanAbilityMode ? "Cancel" : `Use (${usesRemaining})`;
}

ottomanAbilityButton.addEventListener("click", () => {
  if (!currentState?.ottomanAbilityAvailable || currentState.turn !== myColor) return;
  ottomanAbilityMode = !ottomanAbilityMode;
  selectedSquare = null;
  updateOttomanAbilityButton();
  showSelection();
});

chessBoardOverlay.addEventListener("click", (e) => {
  console.log("click", e.target, currentState?.turn, myColor);
  if (!currentState || currentState.turn !== myColor) return;   // not my turn

  const squareEl = e.target.closest("[data-square]");
  if (!squareEl) return;
  const sq = squareEl.dataset.square;

  if (ottomanAbilityMode) {
    const abilityTargets = currentState.ottomanAbilityTargets || {};
    if (selectedSquare && abilityTargets[selectedSquare]?.includes(sq)) {
      socket.emit("ottomanAbilityCapture", { from: selectedSquare, to: sq });
      ottomanAbilityMode = false;
      selectedSquare = null;
      updateOttomanAbilityButton();
      showSelection();
      return;
    }

    selectedSquare = abilityTargets[sq] ? sq : null;
    showSelection();
    return;
  }

  // a piece is selected and I clicked one of its legal targets: send the move
  if (selectedSquare && currentState.legalMoves[selectedSquare]?.includes(sq)) {
    socket.emit("move", { from: selectedSquare, to: sq });
    selectedSquare = null;
    return;
  }

  // otherwise select this piece if it has legal moves, or clear the selection
  selectedSquare = currentState.legalMoves[sq] ? sq : null;
  showSelection();
});

function slidePiece(fromSq, toSq) {
  const fromEl = chessBoardOverlay.querySelector(`[data-square="${fromSq}"]`);
  const toEl = chessBoardOverlay.querySelector(`[data-square="${toSq}"]`);
  const piece = toEl.querySelector(".chess-piece");
  if (!fromEl || !piece) return;

  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();

  // 1. put the piece visually back on its old square, with no transition
  piece.style.transition = "none";
  piece.style.zIndex = 10;
  piece.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;

  piece.getBoundingClientRect();   // forces the browser to apply that before continuing

  // 2. now let it slide to its real square
  piece.style.transition = "transform 0.4s ease";
  piece.style.transform = "translate(0, 0)";

  piece.addEventListener("transitionend", () => {
    piece.style.transition = "";
    piece.style.transform = "";
    piece.style.zIndex = "";
  }, { once: true });
}

function showAbilityBanner(imageSrc) {
  const overlay = document.getElementById('ability-overlay');
  document.getElementById('ability-img').src = imageSrc;

  overlay.classList.remove('play');
  void overlay.offsetWidth;          // restarts the animation if it's triggered twice
  overlay.classList.add('play');
}

function playAbilitySounds() {
  clearTimeout(abilitySoundFadeTimer);
  if (abilitySoundFadeFrame !== null) cancelAnimationFrame(abilitySoundFadeFrame);

  abilitySounds.forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
    sound.volume = 1;
    sound.play().catch(() => {});
  });

  abilitySoundFadeTimer = setTimeout(() => {
    const fadeStartedAt = performance.now();
    const startingVolumes = abilitySounds.map((sound) => sound.volume);
    const fadeDuration = abilityBannerDuration * 0.2;

    const fadeFrame = (now) => {
      const progress = Math.min((now - fadeStartedAt) / fadeDuration, 1);
      abilitySounds.forEach((sound, index) => {
        sound.volume = startingVolumes[index] * (1 - progress);
      });

      if (progress < 1) {
        abilitySoundFadeFrame = requestAnimationFrame(fadeFrame);
      } else {
        abilitySounds.forEach((sound) => sound.pause());
        abilitySoundFadeFrame = null;
      }
    };

    abilitySoundFadeFrame = requestAnimationFrame(fadeFrame);
  }, abilityBannerDuration * 0.8);
}

document.getElementById('ability-overlay').addEventListener('animationend', (e) => {
  if (e.animationName === 'bombard-slide') {
    document.getElementById('ability-overlay').classList.remove('play');
  }
});

socket.on('abilityUsed', ({ ability }) => {
  playAbilitySounds();
  showAbilityBanner(`assets/abilities/${ability}.png`);
});