// create the gif once, hidden (opacity 0 from the CSS)
const gif = document.createElement("img");
gif.src = "assets/dancing.gif";
gif.alt = "";
gif.className = "dancing-gif";
document.body.appendChild(gif);

const empireCards = document.querySelectorAll(".empire-card[data-empire]");

if (empireCards.length > 0) {
  // empire select page: show after 4 seconds, restart when an empire is clicked
  let timer;

  function resetTimer() {
    gif.classList.remove("show");
    clearTimeout(timer);
    timer = setTimeout(() => gif.classList.add("show"), 4000);
  }

  empireCards.forEach((card) => card.addEventListener("click", resetTimer));
  resetTimer();
} else {
  // lobby page: show right away
  requestAnimationFrame(() => gif.classList.add("show"));
}