import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

/*
|--------------------------------------------------------------------------
| SENN AI CONFIG
|--------------------------------------------------------------------------
*/

const SENN = {
  name: "Senn AI",
  version: "2.0.0",
  model: process.env.AI_MODEL || "gpt-5.6-luna"
};

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: SENN.name,
    version: SENN.version,
    status: "online",
    model: SENN.model
  });
});

/*
|--------------------------------------------------------------------------
| SYSTEM STATUS
|--------------------------------------------------------------------------
*/

app.get("/api/status", (req, res) => {
  res.json({
    success: true,

    system: {
      ai: Boolean(process.env.AI_API_KEY),
      web: true,
      memory: true,
      files: true,
      tools: true
    },

    version: SENN.version,

    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| CHAT
|--------------------------------------------------------------------------
*/

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      conversation = [],
      settings = {}
    } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Message cannot be empty."
      });
    }

    const cleanMessage = message.trim();

    /*
    ----------------------------------------------------------------------
    | TEMPORARY AI CORE
    |
    | AI provider akan kita sambungkan setelah struktur core selesai.
    ----------------------------------------------------------------------
    */

    const response = {
      success: true,

      id: crypto.randomUUID(),

      model: SENN.model,

      message: {
        role: "assistant",

        content:
          `Senn AI menerima: "${cleanMessage}"`
      },

      meta: {
        conversationLength: conversation.length,

        settings,

        tools: [],

        sources: []
      }
    };

    return res.json(response);

  } catch (error) {

    console.error(
      "[SENN ERROR]",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Senn AI mengalami kesalahan internal."
    });
  }
});

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan."
  });
});

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {

  console.error(
    "[SERVER ERROR]",
    error
  );

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("        SENN AI 2.0");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Server : http://localhost:${PORT}`);
  console.log(`Model  : ${SENN.model}`);
  console.log("Status : ONLINE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

});
