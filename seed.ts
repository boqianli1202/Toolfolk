import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: { name: "Alice Chen", email: "alice@example.com", password },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: { name: "Bob Martinez", email: "bob@example.com", password },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: { name: "Carol Johnson", email: "carol@example.com", password },
  });

  const calculator = await prisma.tool.create({
    data: {
      title: "Simple Calculator",
      description: "A clean, easy-to-use calculator for basic math. Supports addition, subtraction, multiplication, and division.",
      category: "utilities",
      fileUrl: "/uploads/calculator.html",
      isBrowserRunnable: true,
      instructions: "Click the number buttons and operators, then press = to calculate.",
      downloadCount: 142, viewCount: 523,
      authorId: alice.id,
    },
  });

  const pomodoro = await prisma.tool.create({
    data: {
      title: "Pomodoro Timer",
      description: "Stay focused with this Pomodoro timer. Work in 25-minute sessions with short and long breaks.",
      category: "personal-helper",
      fileUrl: "/uploads/pomodoro.html",
      isBrowserRunnable: true,
      instructions: "Select Focus, Short Break, or Long Break. Click Start to begin.",
      downloadCount: 89, viewCount: 312,
      authorId: bob.id,
    },
  });

  const flashcards = await prisma.tool.create({
    data: {
      title: "Flashcard Maker",
      description: "Create and study flashcards in your browser. Add question-answer pairs, flip cards, and shuffle for practice.",
      category: "academic",
      fileUrl: "/uploads/flashcards.html",
      isBrowserRunnable: true,
      instructions: "Click a card to flip it. Use Previous/Next to navigate. Add cards with the form below.",
      downloadCount: 203, viewCount: 671,
      authorId: carol.id,
    },
  });

  const colorPalette = await prisma.tool.create({
    data: {
      title: "Color Palette Generator",
      description: "Generate beautiful color palettes with one click. Uses color theory for harmonious combinations. Click to copy hex codes.",
      category: "creative",
      fileUrl: "/uploads/color-picker.html",
      isBrowserRunnable: true,
      instructions: "Click Generate for a new palette. Click any swatch to copy its hex code.",
      downloadCount: 167, viewCount: 445,
      authorId: alice.id,
    },
  });

  const metronome = await prisma.tool.create({
    data: {
      title: "Metronome",
      description: "A simple metronome for musicians. Set BPM with slider or Tap Tempo. Clean audio with visual feedback.",
      category: "music",
      fileUrl: "/uploads/metronome.html",
      isBrowserRunnable: true,
      instructions: "Use the slider for BPM (40-240). Click Start to begin. Tap Tempo sets BPM by tapping.",
      downloadCount: 78, viewCount: 234,
      authorId: bob.id,
    },
  });

  const wordCounter = await prisma.tool.create({
    data: {
      title: "Word Counter",
      description: "Count words, characters, sentences, and estimate reading time. Real-time stats as you type. Great for writers and students.",
      category: "academic",
      fileUrl: "/uploads/word-counter.html",
      isBrowserRunnable: true,
      instructions: "Type or paste text. Stats update in real-time.",
      downloadCount: 256, viewCount: 892,
      authorId: carol.id,
    },
  });

  await prisma.review.createMany({
    data: [
      { rating: 5, comment: "Super handy! I use this every day for quick math.", toolId: calculator.id, userId: bob.id },
      { rating: 4, comment: "Clean design and works great. Would love keyboard support!", toolId: calculator.id, userId: carol.id },
      { rating: 5, comment: "This has seriously improved my focus. The simplicity is perfect.", toolId: pomodoro.id, userId: alice.id },
      { rating: 5, comment: "Best Pomodoro timer I've found. No ads, no distractions.", toolId: pomodoro.id, userId: carol.id },
      { rating: 5, comment: "Made studying for my history exam so much easier!", toolId: flashcards.id, userId: alice.id },
      { rating: 4, comment: "Love the shuffle feature. Would be great to save cards between sessions.", toolId: flashcards.id, userId: bob.id },
      { rating: 5, comment: "Beautiful palettes every time. The click-to-copy is a nice touch.", toolId: colorPalette.id, userId: bob.id },
      { rating: 4, comment: "Great for getting design inspiration quickly.", toolId: colorPalette.id, userId: carol.id },
      { rating: 5, comment: "Tap tempo is so useful for practice sessions!", toolId: metronome.id, userId: alice.id },
      { rating: 4, comment: "Clean and simple. Exactly what I needed.", toolId: metronome.id, userId: carol.id },
      { rating: 5, comment: "Use this for every essay I write. The reading time estimate is great!", toolId: wordCounter.id, userId: alice.id },
      { rating: 5, comment: "Simple and effective. No bloat, just what you need.", toolId: wordCounter.id, userId: bob.id },
    ],
  });

  console.log("Seeded database with 3 users, 6 tools, and 12 reviews!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
