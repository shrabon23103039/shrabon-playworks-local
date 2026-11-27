const copy = {
  en: {
    title: "Meteor Dash",
    help: "Move with ← → or A/D. On touch screens, drag left or right.",
    score: "SCORE",
    ready: "Ready, pilot?",
    dodge: "Dodge as long as you can.",
    start: "Start game",
    again: "Play again",
    over: "Run complete",
    final: (score) => `You scored ${score}. Ready for another run?`,
  },
  bn: {
    title: "উল্কা দৌড়",
    help: "← → অথবা A/D দিয়ে নড়ুন। টাচস্ক্রিনে বাম বা ডানে টেনে নিন।",
    score: "স্কোর",
    ready: "পাইলট, প্রস্তুত?",
    dodge: "যতক্ষণ পারেন উল্কা এড়িয়ে চলুন।",
    start: "খেলা শুরু",
    again: "আবার খেলুন",
    over: "খেলা শেষ",
    final: (score) => `আপনার স্কোর ${score}। আবার খেলবেন?`,
  },
};

const language = new URLSearchParams(location.search).get("lang") === "bn" ? "bn" : "en";
const text = copy[language];
document.documentElement.lang = language;
document.title = `${text.title} — Shrabon Playworks`;
document.querySelector("#game-title").textContent = text.title;
document.querySelector("#game-help").textContent = text.help;
document.querySelector("#score-label").textContent = text.score;
document.querySelector("#status-title").textContent = text.ready;
document.querySelector("#status-copy").textContent = text.dodge;
document.querySelector("#start").textContent = text.start;

const canvas = document.querySelector("#arena");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const scoreNode = document.querySelector("#score");
const startButton = document.querySelector("#start");
const keys = new Set();
let playerX = canvas.width / 2;
let meteors = [];
let score = 0;
let active = false;
let previousTime = 0;
let spawnClock = 0;
let animationFrame = 0;

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#10111b";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 36; i += 1) {
    context.fillStyle = i % 4 === 0 ? "#8057ff" : "#596080";
    context.globalAlpha = 0.24 + (i % 3) * 0.12;
    context.fillRect((i * 197 + 31) % canvas.width, (i * 89 + 17) % canvas.height, 2, 2);
  }
  context.globalAlpha = 1;
  context.fillStyle = "#35b8ff";
  context.shadowColor = "#35b8ff";
  context.shadowBlur = 20;
  context.beginPath();
  context.moveTo(playerX, canvas.height - 42);
  context.lineTo(playerX - 18, canvas.height - 12);
  context.lineTo(playerX + 18, canvas.height - 12);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  for (const meteor of meteors) {
    context.fillStyle = "#ff5c9a";
    context.beginPath();
    context.arc(meteor.x, meteor.y, meteor.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffb2cf";
    context.beginPath();
    context.arc(meteor.x - 3, meteor.y - 3, Math.max(2, meteor.radius / 4), 0, Math.PI * 2);
    context.fill();
  }
}

function finish() {
  active = false;
  cancelAnimationFrame(animationFrame);
  document.querySelector("#status-title").textContent = text.over;
  document.querySelector("#status-copy").textContent = text.final(score);
  startButton.textContent = text.again;
  overlay.classList.remove("hidden");
}

function frame(time) {
  if (!active) return;
  const delta = Math.min(34, time - previousTime || 16);
  previousTime = time;
  if (keys.has("ArrowLeft") || keys.has("a")) playerX -= delta * 0.38;
  if (keys.has("ArrowRight") || keys.has("d")) playerX += delta * 0.38;
  playerX = Math.max(20, Math.min(canvas.width - 20, playerX));
  spawnClock += delta;
  if (spawnClock > Math.max(260, 850 - score * 3)) {
    spawnClock = 0;
    meteors.push({ x: 18 + Math.random() * (canvas.width - 36), y: -16, radius: 7 + Math.random() * 9 });
  }
  const speed = 0.18 + Math.min(score, 70) * 0.003;
  meteors = meteors.filter((meteor) => {
    meteor.y += delta * speed;
    if (meteor.y > canvas.height + meteor.radius) {
      score += 1;
      scoreNode.textContent = String(score);
      return false;
    }
    if (meteor.y > canvas.height - 58 && meteor.y < canvas.height - 10 &&
        Math.abs(meteor.x - playerX) < meteor.radius + 13) {
      finish();
      return false;
    }
    return true;
  });
  draw();
  animationFrame = requestAnimationFrame(frame);
}

function start() {
  cancelAnimationFrame(animationFrame);
  playerX = canvas.width / 2;
  meteors = [];
  score = 0;
  previousTime = 0;
  spawnClock = 0;
  scoreNode.textContent = "0";
  active = true;
  overlay.classList.add("hidden");
  animationFrame = requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) {
    event.preventDefault();
    keys.add(event.key.toLowerCase() === "arrowleft" ? "ArrowLeft" : event.key.toLowerCase() === "arrowright" ? "ArrowRight" : event.key.toLowerCase());
  }
});
document.addEventListener("keyup", (event) => keys.delete(event.key));
canvas.addEventListener("pointermove", (event) => {
  if (!active || event.pointerType === "mouse" && event.buttons === 0) return;
  const bounds = canvas.getBoundingClientRect();
  playerX = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
});
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  if (active) {
    const bounds = canvas.getBoundingClientRect();
    playerX = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
  }
});
startButton.addEventListener("click", start);
draw();
