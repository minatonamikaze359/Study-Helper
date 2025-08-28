// WhatsApp Study Assistant Bot
// Using Baileys

import makeWASocket, { useMultiFileAuthState } from "@adiwajshing/baileys";
import fs from "fs-extra";
import cron from "node-cron";

const DB_FILE = "./database.json";
const QUESTIONS = JSON.parse(fs.readFileSync("./data/questions.json"));
const SUMMARIES = JSON.parse(fs.readFileSync("./data/summaries.json"));

// Create DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, {});
}

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

    if (cmd === ".start") {
      user.name = args[1] || "Student";
      saveDB();
      await sock.sendMessage(from, { text: `✅ Registered as ${user.name}!` });
    }

    if (cmd === ".doubt") {
      const question = args.slice(1).join(" ");
      if (!question) return sock.sendMessage(from, { text: "❓ Please provide a question!" });
      await sock.sendMessage(from, { text: `🤖 Doubt Solver:\n${question}\n\n(Answering system to be connected with AI API here)` });
    }

    if (cmd === ".daily") {
      const q = QUESTIONS.daily[Math.floor(Math.random() * QUESTIONS.daily.length)];
      user.dailyQuestion = q;
      saveDB();
      await sock.sendMessage(from, { text: `📅 Daily Question:\n${q.question}\n${q.options.join("\n")}\n\nReply with A/B/C/D` });
    }

    if (["a", "b", "c", "d"].includes(text.toLowerCase()) && user.dailyQuestion) {
      if (text.toUpperCase() === user.dailyQuestion.answer) {
        user.points += 10;
        user.dailyAnswered++;
        await sock.sendMessage(from, { text: `✅ Correct! +10 points\nExplanation: ${user.dailyQuestion.explanation}` });
      } else {
        await sock.sendMessage(from, { text: `❌ Wrong!\nCorrect Answer: ${user.dailyQuestion.answer}\nExplanation: ${user.dailyQuestion.explanation}` });
      }
      user.dailyQuestion = null;
      saveDB();
    }

    if (cmd === ".summary") {
      const topic = args.slice(1).join(" ").toLowerCase();
      const summary = SUMMARIES[topic];
      if (!summary) return sock.sendMessage(from, { text: "📘 Topic not found!" });
      await sock.sendMessage(from, { text: `🌱 Summary of ${topic}:\n${summary}` });
    }

    if (cmd === ".mock") {
      const num = parseInt(args[1]) || 5;
      const mock = QUESTIONS.mock.slice(0, num);
      user.mock = mock;
      user.mockIndex = 0;
      user.mockScore = 0;
      saveDB();
      await sock.sendMessage(from, { text: `📝 Starting Mock Test with ${num} questions! Reply A/B/C/D.` });
      await sock.sendMessage(from, { text: `${mock[0].question}\n${mock[0].options.join("\n")}` });
    }

    if (["a", "b", "c", "d"].includes(text.toLowerCase()) && user.mock) {
      const currentQ = user.mock[user.mockIndex];
      if (text.toUpperCase() === currentQ.answer) {
        user.mockScore++;
        await sock.sendMessage(from, { text: `✅ Correct!` });
      } else {
        await sock.sendMessage(from, { text: `❌ Wrong! Correct: ${currentQ.answer}` });
      }
      user.mockIndex++;
      if (user.mockIndex < user.mock.length) {
        await sock.sendMessage(from, { text: `${user.mock[user.mockIndex].question}\n${user.mock[user.mockIndex].options.join("\n")}` });
      } else {
        await sock.sendMessage(from, { text: `🏆 Mock Test Finished!\nScore: ${user.mockScore}/${user.mock.length}` });
        user.mockTests.push({ score: user.mockScore, total: user.mock.length });
        delete user.mock;
        saveDB();
      }
    }

    if (cmd === ".progress") {
      const totalTests = user.mockTests.length;
      const avg = totalTests ? (user.mockTests.reduce((a, b) => a + b.score, 0) / totalTests).toFixed(2) : 0;
      await sock.sendMessage(from, { text: `📊 Progress Report for ${user.name}\n- Points: ${user.points}\n- Daily Qs Answered: ${user.dailyAnswered}\n- Mock Tests Taken: ${totalTests}\n- Avg Score: ${avg}` });
    }
  });

  console.log("✅ Bot is running...");
}

startBot();
