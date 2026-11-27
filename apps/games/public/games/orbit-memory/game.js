const copy = {
  en: {
    title: "Orbit Memory",
    help: "Select two cards to reveal them. Match every pair to finish.",
    board: "Memory card board",
    moves: "MOVES",
    pairs: "PAIRS",
    restart: "Restart",
    complete: (moves) => `All pairs matched in ${moves} moves. Brilliant!`,
  },
  bn: {
    title: "কক্ষপথ স্মৃতি",
    help: "দুটি কার্ড বেছে দেখুন। সব জোড়া মেলালেই খেলা শেষ।",
    board: "স্মৃতির কার্ড বোর্ড",
    moves: "চাল",
    pairs: "জোড়া",
    restart: "আবার শুরু",
    complete: (moves) => `${moves} চালে সব জোড়া মিলেছে। দারুণ!`,
  },
};
const language = new URLSearchParams(location.search).get("lang") === "bn" ? "bn" : "en";
const text = copy[language];
document.documentElement.lang = language;
document.title = `${text.title} — Shrabon Playworks`;
document.querySelector("#game-title").textContent = text.title;
document.querySelector("#game-help").textContent = text.help;
document.querySelector("#board").setAttribute("aria-label", text.board);
document.querySelector("#moves-label").textContent = text.moves;
document.querySelector("#pairs-label").textContent = text.pairs;
document.querySelector("#restart").textContent = text.restart;

const symbols = ["☾", "✦", "◈", "♧", "☼", "⬡"];
const board = document.querySelector("#board");
const movesNode = document.querySelector("#moves");
const pairsNode = document.querySelector("#pairs");
const message = document.querySelector("#message");
let firstCard;
let locked = false;
let moves = 0;
let pairs = 0;

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function choose(card) {
  if (locked || card.disabled || card === firstCard) return;
  card.textContent = symbols[Number(card.dataset.symbol)];
  card.classList.add("revealed");
  card.setAttribute("aria-label", `${language === "bn" ? "কার্ড" : "Card"} ${symbols[Number(card.dataset.symbol)]}`);
  if (!firstCard) {
    firstCard = card;
    return;
  }
  moves += 1;
  movesNode.textContent = String(moves);
  if (firstCard.dataset.symbol === card.dataset.symbol) {
    firstCard.disabled = true;
    card.disabled = true;
    firstCard.classList.replace("revealed", "matched");
    card.classList.replace("revealed", "matched");
    firstCard = undefined;
    pairs += 1;
    pairsNode.textContent = `${pairs} / 6`;
    if (pairs === symbols.length) message.textContent = text.complete(moves);
    return;
  }
  locked = true;
  const previous = firstCard;
  firstCard = undefined;
  window.setTimeout(() => {
    for (const item of [previous, card]) {
      item.textContent = "✧";
      item.classList.remove("revealed");
      item.setAttribute("aria-label", language === "bn" ? "লুকানো কার্ড" : "Hidden card");
    }
    locked = false;
  }, 720);
}

function start() {
  firstCard = undefined;
  locked = false;
  moves = 0;
  pairs = 0;
  movesNode.textContent = "0";
  pairsNode.textContent = "0 / 6";
  message.textContent = "";
  board.replaceChildren();
  for (const symbol of shuffle([...symbols, ...symbols])) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "memory-card";
    card.dataset.symbol = String(symbols.indexOf(symbol));
    card.textContent = "✧";
    card.setAttribute("aria-label", language === "bn" ? "লুকানো কার্ড" : "Hidden card");
    card.addEventListener("click", () => choose(card));
    board.append(card);
  }
}

document.querySelector("#restart").addEventListener("click", start);
start();
