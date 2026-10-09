const bgm = document.getElementById('bg-music');
const overlay = document.getElementById('start-overlay');

const GAME_VISUALS = {
  ottoman: {
    board: "assets/images/board/board-ottoman.png",
    flag: "assets/images/flags/ottoman_flag.png",
    avatar: "assets/images/avatars/avatar-sultan.png",
    playerCard: "assets/images/backgrounds/ottoman/playercard-bg-turkey.png",
    nameCard: "assets/images/backgrounds/ottoman/namecard-bg-turkey.png"
  },
  roman: {
    board: "assets/images/board/board-roman.png",
    flag: "assets/images/flags/roman_flag.png",
    avatar: "assets/images/avatars/avatar-roman.png",
    playerCard: "assets/images/backgrounds/roman/playercard-bg-roman.png",
    nameCard: "assets/images/backgrounds/roman/namecard-bg-roman.png"
  },
  carthaginian: {
    board: "assets/images/board/board-carthaginian.png",
    flag: "assets/images/flags/carthaginian_flag.png",
    avatar: "assets/images/avatars/avatar-carthage.png",
    playerCard: "assets/images/backgrounds/carthaginian/playercard-bg-carthage.png",
    nameCard: "assets/images/backgrounds/carthaginian/namecard-bg-carthage.png"
  },
  egyptian: {
    board: "assets/images/board/board-egyptian.png",
    flag: "assets/images/flags/egyptian_flag.png",
    avatar: "assets/images/avatars/avatar-egyptian.png",
    playerCard: "assets/images/backgrounds/egyptian/playercard-bg-egyptian.png",
    nameCard: "assets/images/backgrounds/egyptian/namecard-bg-egyptian.png"
  },
  andalus: {
    board: "assets/images/board/board-andalus.png",
    flag: "assets/images/flags/andalus_flag.png",
    avatar: "assets/images/avatars/avatar-andalus.png",
    playerCard: "assets/images/backgrounds/andalus/playercard-bg-andalus.png",
    nameCard: "assets/images/backgrounds/andalus/namecard-bg-andalus.png"
  }
};

function applyGameVisuals(empire, opponentEmpire) {
  const visuals = GAME_VISUALS[empire];
  if (!visuals) return;

  document.body.dataset.empire = empire;

  const board = document.getElementById("game-board");
  const flag = document.getElementById("player-flag");
  const headerAvatar = document.getElementById("header-profile-avatar");
  const bannerAvatar = document.getElementById("player-banner-avatar");

  if (board && visuals.board) board.src = visuals.board;
  if (flag && visuals.flag) flag.src = visuals.flag;
  if (headerAvatar) headerAvatar.src = visuals.avatar;
  if (bannerAvatar) bannerAvatar.src = visuals.avatar;
  document.body.style.setProperty("--bg-player-card", `url("${visuals.playerCard}")`);
  document.body.style.setProperty("--bg-player-name", `url("${visuals.nameCard}")`);

  const opponentVisuals = GAME_VISUALS[opponentEmpire];
  if (!opponentVisuals) return;

  document.body.dataset.opponentEmpire = opponentEmpire;
  const opponentFlag = document.getElementById("opponent-flag");
  const opponentAvatar = document.getElementById("opponent-banner-avatar");
  if (opponentFlag) opponentFlag.src = opponentVisuals.flag;
  if (opponentAvatar) opponentAvatar.src = opponentVisuals.avatar;
  document.body.style.setProperty("--bg-opponent-card", `url("${opponentVisuals.playerCard}")`);
  document.body.style.setProperty("--bg-opponent-name", `url("${opponentVisuals.nameCard}")`);
}

if (bgm) {
  // pick up where the last page left off
  bgm.currentTime = sessionStorage.getItem('bgm-time') || 0;

  // save the position every half second
  setInterval(() => sessionStorage.setItem('bgm-time', bgm.currentTime), 500);

  // home page: wait for a key, then play and hide the overlay
  if (overlay) {
    window.addEventListener('keydown', () => {
      bgm.play();
      overlay.style.display = 'none';
    }, { once: true });
  } else {
    // other pages: just play
    bgm.play().catch(() => {});
  }
}

const savedEmpire = sessionStorage.getItem("empire") || localStorage.getItem("selectedEmpire");
if (savedEmpire) {
  document.body.dataset.empire = savedEmpire;
  applyGameVisuals(savedEmpire);
}

const empireGrids = document.querySelectorAll(".empire-grid");
const statusEl = document.querySelector(".status");
const infoBox = document.querySelector(".info-box");
const startBtn = document.querySelector(".start-btn");
const EMPIRE_INFO = {
  carthaginian: {
    name: "Carthaginian",
    description: "A North African maritime power known for trade and Hannibal's campaigns."
  },
  ottoman: {
    name: "Ottoman",
    description: "An empire centered in Anatolia that captured Constantinople in 1453."
  },
  roman: {
    name: "Roman",
    description: "A Mediterranean civilization whose republic grew into a vast empire."
  },
  egyptian: {
    name: "Egyptian",
    description: "An ancient civilization shaped by the Nile and its fertile valley."
  },
  andalus: {
    name: "Andalus",
    description: "Al-Andalus was renowned for scholarship, architecture, and cultural exchange."
  }
};

if (startBtn) {
  startBtn.disabled = true;
}

function selectEmpire(card) {
  const empire = card.dataset.empire;
  const details = EMPIRE_INFO[empire];
  if (!details) return;

  document.querySelectorAll(".empire-card.selected").forEach((selectedCard) => {
    selectedCard.classList.remove("selected");
  });
  card.classList.add("selected");

  if (statusEl) statusEl.textContent = "P1 Empire: " + details.name;
  if (infoBox) infoBox.textContent = details.description;
  if (startBtn) startBtn.disabled = false;

  applyTheme(empire);
}

document.querySelectorAll(".empire-card[data-empire]").forEach((card) => {
  card.addEventListener("click", () => selectEmpire(card));
});

startBtn?.addEventListener("click", () => {
    startBtn.disabled = true;
    localStorage.setItem("selectedEmpire", document.body.dataset.empire);
    sessionStorage.setItem("empire", document.body.dataset.empire);
    window.location.href = "lobby.html";
});

// music for each empire (the visuals live in the CSS, under body[data-empire="..."])
const THEMES = {
  ottoman:      { music: "assets/music/ottoman.mp3",      quote: "assets/music/quote-ottoman.mp3" },
  roman:        { music: "assets/music/roman.mp3",        quote: "assets/music/quote-roman.mp3" },
  carthaginian: { music: "assets/music/carthaginian.mp3", quote: "assets/music/quote-carthaginian.mp3" },
  egyptian:     { music: "assets/music/egyptian.mp3",     quote: "assets/music/quote-egyptian.mp3" },
  andalus:      { music: "assets/music/andalus.mp3",      quote: "assets/music/quote-andalus.mp3" }
};

function applyTheme(empire) {
  const theme = THEMES[empire];
  if (!theme) return;                       // e.g. the empty "Select an Empire" slots

  document.body.dataset.empire = empire;    // CSS swaps all the visuals

  if (bgm.getAttribute("src") !== theme.music) {
    bgm.src = theme.music;                  // only reload if it's a different track
  }
  bgm.play().catch(() => {});

  quote.src = theme.quote;                  // the Start button code plays it
}

selectEmpire(document.querySelector('.empire-card[data-empire="ottoman"]'));