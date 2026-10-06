const bgm = document.getElementById('bg-music');
const overlay = document.getElementById('start-overlay');

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

const quote    = document.getElementById("quote-audio");
const startAudio    = document.getElementById("start-audio");
const introOverlay  = document.getElementById("intro-overlay");
const countEl  = document.getElementById("intro-count");

// lowers the volume a little every 50ms until it reaches 0
function fadeOut(audio, duration) {
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
  return new Promise(resolve => {
    const finish = () => resolve();
    quote.addEventListener("ended", finish, { once: true });
    quote.addEventListener("error", finish, { once: true });
    quote.play().catch(finish);
  });
}

function countdown(quoteFinished) {
  let n = 3;
  countEl.textContent = n;

  // resolves when the 3-2-1 is done
  const countdownDone = new Promise(resolve => {
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

  // go to the game only when BOTH the countdown and the quote are finished
  Promise.all([countdownDone, quoteFinished]).then(() => {
    introOverlay.classList.add("leaving");
    setTimeout(() => {
      window.location.href = "game.html";
    }, 500); // lets the "leaving" animation play first
  });
}

startBtn.addEventListener("click", () => {
    startBtn.disabled = true;      // prevents double clicks
    introOverlay.classList.add("show"); // screen fades to black
    fadeOut(bgm, 2000);          // music fades over 2s
    const quoteFinished = playQuote(); // character quote starts
    startAudio.play();
    fadeOut(startAudio, 5000);
    setTimeout(() => countdown(quoteFinished), 2500); // countdown begins after the fade
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