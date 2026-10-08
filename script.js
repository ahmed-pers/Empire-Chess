const bgm = document.getElementById('bg-music');
const overlay = document.getElementById('start-overlay');

const GAME_VISUALS = {
  ottoman: {
    board: "assets/images/board/board-ottoman.png",
    flag: "assets/images/flags/ottoman_flag.png",
    opponentFlag: "assets/images/flags/carthaginian_flag.png",
    avatar: "assets/images/avatars/avatar-sultan.png"
  },
  roman: {
    board: "assets/images/board/board-roman.png",
    flag: "assets/images/flags/roman_flag.png",
    opponentFlag: "assets/images/flags/carthaginian_flag.png",
    avatar: "assets/images/avatars/avatar-roman.png"
  },
  carthaginian: {
    board: "assets/images/board/board-carthaginian.png",
    flag: "assets/images/flags/carthaginian_flag.png",
    opponentFlag: "assets/images/flags/ottoman_flag.png",
    avatar: "assets/images/avatars/avatar-carthage.png"
  },
  egyptian: {
    board: "assets/images/board/board-egyptian.png",
    flag: "assets/images/flags/egyptian_flag.png",
    opponentFlag: "assets/images/flags/carthaginian_flag.png",
    avatar: "assets/images/avatars/avatar-egyptian.png"
  },
  andalus: {
    board: "assets/images/board/board-andalus.png",
    flag: "assets/images/flags/andalus_flag.png",
    opponentFlag: "assets/images/flags/carthaginian_flag.png",
    avatar: "assets/images/avatars/avatar-andalus.png"
  }
};

function applyGameVisuals(empire) {
  const visuals = GAME_VISUALS[empire];
  if (!visuals) return;

  const board = document.getElementById("game-board");
  const flag = document.getElementById("player-flag");
  const opponentFlag = document.getElementById("opponent-flag");
  const headerAvatar = document.getElementById("header-profile-avatar");
  const bannerAvatar = document.getElementById("player-banner-avatar");

  if (board && visuals.board) board.src = visuals.board;
  if (flag && visuals.flag) flag.src = visuals.flag;
  if (opponentFlag && visuals.opponentFlag) opponentFlag.src = visuals.opponentFlag;
  if (headerAvatar) headerAvatar.src = visuals.avatar;
  if (bannerAvatar) bannerAvatar.src = visuals.avatar;
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
const statuses = document.querySelectorAll(".status");
const empireInfo = document.querySelectorAll(".empire-info");
const infoBoxes = document.querySelectorAll(".info-box");
const startBtn = document.querySelector(".start-btn");
if (startBtn) {
  startBtn.disabled = true;
}

empireGrids.forEach((empireGrid, index) => {
  empireGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".empire-card");
    
    if (card) {
      startBtn.disabled = false;
      empireGrid.querySelectorAll(".empire-card").forEach((c) => {
        c.classList.remove("selected");
      });
      
      // Add 'selected' to the clicked card
      card.classList.add("selected");

      // switch background, preview, colors and music to this empire
      applyTheme(card.dataset.empire);

      const spanText = card.querySelector("span")?.textContent;
      
      // 1. Update the corresponding status text
      if (statuses[index]) {
        statuses[index].textContent = "P1 Empire : " + spanText;
      }

      // 2. Update the corresponding info-box using the index
      if (infoBoxes[index]) {
        const computedStyle = getComputedStyle(card);
        const empireInfo = computedStyle.getPropertyValue("--empire-info").replace(/^["']|["']$/g, "").trim();
        
        if (empireInfo) {
          infoBoxes[index].textContent = empireInfo;
        }
      }

    }
  });
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

// start with Ottoman already selected (runs the same code as a real click:
// selected card, status text, info box, Start button, theme)
document.querySelector('.empire-card[data-empire="ottoman"]')?.click();