import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ========================================
// SENN AI - BASIC SERVER
// ========================================

app.get("/", (req, res) => {
  res.json({
    name: "Senn AI",
    version: "2.0.0",
    status: "online",
    message: "Senn AI backend is running."
  });
});

// ========================================
// CHAT ENDPOINT
// ========================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversation = [] } = req.body;

    // Cek apakah user mengirim pesan
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required."
      });
    }

    console.log("User:", message);

    // AI Core belum dipasang.
    // Untuk sekarang kita hanya menguji
    // apakah backend berhasil menerima pesan.

    return res.json({
      success: true,
      reply: "Senn AI Core menerima pesan.",
      received: message,
      conversationLength: conversation.length
    });

  } catch (error) {
    console.error("Senn AI Error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(
    `Senn AI backend running on port ${PORT}`
  );
});
