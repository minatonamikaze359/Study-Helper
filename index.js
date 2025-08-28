// WhatsApp Study Assistant Bot
// Auto-generating Questions & Summaries (No external JSON)

import makeWASocket, { useMultiFileAuthState } from "@adiwajshing/baileys";
import fs from "fs-extra";

const DB_FILE = "./database.json";

// Create DB if not exists
if (!fs.existsSync(DB_FILE)) fs.writeJsonSync(DB_FILE, {});

// Load DB
let db = fs.readJsonSync(DB_FILE);

// Save DB
function saveDB() {
  fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
}

// Get User Data
function getUser(id) {
  if (!db[id]) {
    db[id] = { name: "", points: 0, dailyAnswered: 0, mockTests: [] };
    saveDB();
  }
  return db[id];
}

// 🔹 Built-in pool of Daily Questions
const dailyQuestions = [
  {
    question: "Which is the largest gland in human body?",
    options: ["A) Pancreas", "B) Liver", "C) Kidney", "D) Salivary gland"],
    answer: "B",
    explanation: "Liver is the largest gland."
  },
  {
    question: "Which part of the cell is known as the powerhouse?",
    options: ["A) Nucleus", "B) Mitochondria", "C) Ribosome", "D) Golgi body"],
    answer: "B",
    explanation: "Mitochondria generate ATP through respiration."
  },
  {
    question: "DNA stands for?",
    options: ["A) Deoxyribo Nucleic Acid", "B) Double Nucleic Acid", "C) Dextrose Nucleic Acid", "D) None"],
    answer: "A",
    explanation: "DNA = Deoxyribonucleic Acid."
  }
];

// 🔹 Built-in pool of Mock Questions
const mockQuestions = [
  {
    question: "Which gas is used in photosynthesis?",
    options: ["A) Oxygen", "B) Nitrogen", "C) Carbon dioxide", "D) Hydrogen"],
    answer: "C",
    explanation: "Plants use CO₂ for photosynthesis."
  },
  {
    question: "Which blood cells fight infections?",
    options: ["A) RBC", "B) WBC", "C) Platelets", "D) Plasma"],
    answer: "B",
    explanation: "WBCs defend against pathogens."
  },
  {
    question: "Smallest functional unit of kidney?",
    options: ["A) Nephron", "B) Alveoli", "C) Glomerulus", "D) Tubule"],
    answer: "A",
    explanation: "Nephron is the structural & functional unit of kidney."
  }
];

// 🔹 Built-in Biology Summaries
const summaries = {
  photosynthesis: "🌿 Photosynthesis occurs in chloroplasts. Light reaction produces ATP & NADPH, while Calvin Cycle fixes CO₂ into glucose.",
  respiration: "🔥 Cellular respiration happens in mitochondria. It includes glycolysis, Krebs cycle, and electron transport chain to produce ATP.",
  dna: "🧬 DNA (Deoxyribonucleic Acid) stores genetic information. It has a double helix structure discovered by Watson & Crick.",
  cell: "🔬 The cell is the structural & functional unit of life. Contains organelles like nucleus, mitochondria, ribosomes, etc."
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m.message) return;

    const from = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";

    if (!text.startsWith(".")) return;

    const user = getUser(from);
    const args = text.split(" ");
    const cmd = args[0].toLowerCase();

    // ✅ Register
    if (cmd === ".start") {
      user.name = args[1] || "Student";
      saveDB();
      await sock.sendMessage(from, { text: `✅ Registered as ${user.name}!` });
    }

    // ✅ Doubt Solver (placeholder, later AI)
    if (cmd === ".doubt") {
      const question = args.slice(1).join(" ");
      if (!question) return sock.sendMessage(from, { text: "❓ Please provide a question!" });
      await sock.sendMessage(from, { text: `🤖 Doubt Solver:\n${question}\n\n(This feature can be linked with AI API later!)` });
    }

    // ✅ Daily Question
    if (cmd === ".daily") {
      const q = dailyQuestions[Math.floor(Math.random() * dailyQuestions.length)];
      user.dailyQuestion = q;
      saveDB();
      await sock.sendMessage(from, { text: `📅 Daily Question:\n${q.question}\n${q.options.join("\n")}\n\nReply with A/B/C/D` });
    }

    // ✅ Check Answer for Daily
    if (["a", "b", "c", "d"].includes(text.toLowerCase()) && user.dailyQuestion) {
      const q = user.dailyQuestion;
      if (text.toUpperCase() === q.answer) {
        user.points += 10;
        user.dailyAnswered++;
        await sock.sendMessage(from, { text: `✅ Correct! +10 points\nExplanation: ${q.explanation}` });
      } else {
        await sock.sendMessage(from, { text: `❌ Wrong!\nCorrect Answer: ${q.answer}\nExplanation: ${q.explanation}` });
      }
      user.dailyQuestion = null;
      saveDB();
    }

    // ✅ Summaries
    if (cmd === ".summary") {
      const topic = args.slice(1).join(" ").toLowerCase();
      const summary = summaries[topic];
      if (!summary) return sock.sendMessage(from, { text: "📘 Topic not found! Try: photosynthesis, respiration, dna, cell" });
      await sock.sendMessage(from, { text: summary });
    }

    // ✅ Mock Test
    if (cmd === ".mock") {
      const num = parseInt(args[1]) || 3;
      const mock = mockQuestions.slice(0, num);
      user.mock = mock;
      user.mockIndex = 0;
      user.mockScore = 0;
      saveDB();
      await sock.sendMessage(from, { text: `📝 Starting Mock Test with ${num} questions! Reply A/B/C/D.` });
      await sock.sendMessage(from, { text: `${mock[0].question}\n${mock[0].options.join("\n")}` });
    }

    // ✅ Mock Test Answering
    if (["a", "b", "c", "d"].includes(text.toLowerCase()) && user.mock) {
      const currentQ = user.mock[user.mockIndex];
      if (text.toUpperCase() === currentQ.answer) {
        user.mockScore++;
        await sock.sendMessage(from, { text: `✅ Correct!` });
      } else {
        await sock.sendMessage(from, { text: `❌ Wrong! Correct: ${currentQ.answer}` });
      }
      user.mockIndex++;
      if (user.mockIndex <
