import "../load-env.js";
import { closePool, getPool } from "../db.js";
import { isValidGameEntryPath } from "../security.js";

const pool = getPool();
const categories = [
  { slug: "arcade", name: { en: "Arcade", bn: "আর্কেড" }, order: 1 },
  { slug: "puzzle", name: { en: "Puzzle", bn: "ধাঁধা" }, order: 2 },
];

const games = [
  {
    slug: "meteor-dash",
    title: { en: "Meteor Dash", bn: "উল্কা দৌড়" },
    short: { en: "Dodge the falling stars and beat your best.", bn: "পড়ন্ত উল্কা এড়িয়ে নিজের রেকর্ড ভাঙুন।" },
    description: { en: "A quick arcade survival game made for Shrabon Playworks.", bn: "Shrabon Playworks-এর জন্য তৈরি একটি ছোট আর্কেড সারভাইভাল গেম।" },
    instructions: { en: "Move with ← → or A/D. On touch screens, drag left or right.", bn: "← → অথবা A/D দিয়ে নড়ুন। টাচস্ক্রিনে বাম বা ডানে টেনে নিন।" },
    tags: ["arcade", "survival"],
    entry: "/games/meteor-dash/index.html",
  },
  {
    slug: "orbit-memory",
    title: { en: "Orbit Memory", bn: "কক্ষপথ স্মৃতি" },
    short: { en: "Find the matching pairs among the planets.", bn: "গ্রহগুলোর মধ্যে মিল থাকা জোড়া খুঁজুন।" },
    description: { en: "A calm, original memory puzzle. Match every pair in as few turns as you can.", bn: "একটি শান্ত, নিজস্ব স্মৃতির ধাঁধা। যত কম চালে সম্ভব সব জোড়া মেলান।" },
    instructions: { en: "Select two cards to reveal them. Match all pairs to finish.", bn: "দুটি কার্ড বেছে দেখুন। সব জোড়া মেলালেই খেলা শেষ।" },
    tags: ["puzzle", "memory"],
    entry: "/games/orbit-memory/index.html",
  },
];

try {
  for (const category of categories) {
    await pool.query(
      `INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [category.slug, JSON.stringify(category.name), category.order],
    );
  }

  for (const game of games) {
    if (!isValidGameEntryPath(game.entry)) throw new Error(`Invalid built-in entry for ${game.slug}`);
    const category = await pool.query<{ id: string }>(
      "SELECT id FROM categories WHERE slug = $1",
      [game.slug === "orbit-memory" ? "puzzle" : "arcade"],
    );
    const categoryId = category.rows[0]?.id;
    if (!categoryId) throw new Error(`Missing category for ${game.slug}`);
    await pool.query(
      `INSERT INTO games
        (slug, title, short_description, description, instructions, tags, category_id, entry_path, status)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, 'draft')
       ON CONFLICT (slug) DO NOTHING`,
      [
        game.slug,
        JSON.stringify(game.title),
        JSON.stringify(game.short),
        JSON.stringify(game.description),
        JSON.stringify(game.instructions),
        JSON.stringify(game.tags),
        categoryId,
        game.entry,
      ],
    );
  }
  console.log("Seeded two original playable games as drafts; publishing requires an authenticated admin.");
} finally {
  await closePool();
}
