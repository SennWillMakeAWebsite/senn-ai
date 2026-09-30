import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  routeRequest
} from "./core/router.js";

import {
  analyzeLanguage
} from "./core/language.js";

import {
  buildContextPackage,
  appendUserMessage,
  appendAssistantMessage,
  getConversationStats
} from "./core/context.js";

import {
  generateAIResponse,
  isAIConfigured
} from "./core/ai.js";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 3000;


/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);


/*
|--------------------------------------------------------------------------
| SENN CONFIG
|--------------------------------------------------------------------------
*/

const SENN = {
  name: "Senn AI",
  version: "2.0.0"
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

    aiConfigured:
      isAIConfigured(),

    timestamp:
      new Date().toISOString()
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
      server: true,

      ai:
        isAIConfigured(),

      language: true,

      context: true,

      router: true,

      web: false,

      memory: false,

      files: false
    },

    version:
      SENN.version,

    timestamp:
      new Date().toISOString()
  });
});


/*
|--------------------------------------------------------------------------
| CHAT
|--------------------------------------------------------------------------
*/

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      const {
        message,

        conversation = [],

        settings = {}
      } = req.body;


      /*
      ----------------------------------------------------------------------
      | VALIDATION
      ----------------------------------------------------------------------
      */

      if (
        typeof message !== "string" ||
        !message.trim()
      ) {

        return res.status(400).json({
          success: false,

          error:
            "Message cannot be empty."
        });

      }


      const cleanMessage =
        message.trim();


      /*
      ----------------------------------------------------------------------
      | 1. LANGUAGE ANALYSIS
      ----------------------------------------------------------------------
      */

      const language =
        analyzeLanguage({
          message:
            cleanMessage,

          conversation
        });


      /*
      ----------------------------------------------------------------------
      | 2. ROUTING
      ----------------------------------------------------------------------
      */

      const routing =
        routeRequest({
          message:
            language.normalizedMessage,

          conversation,

          settings
        });


      /*
      ----------------------------------------------------------------------
      | 3. CONTEXT
      ----------------------------------------------------------------------
      */

      const context =
        buildContextPackage({
          conversation,

          languageAnalysis:
            language,

          userMessage:
            cleanMessage
        });


      /*
      ----------------------------------------------------------------------
      | 4. CREATE AI CONVERSATION
      ----------------------------------------------------------------------
      */

      const updatedConversation =
        appendUserMessage(
          conversation,

          cleanMessage,

          {
            language:
              language.language,

            intent:
              routing.intent,

            tools:
              routing.tools
          }
        );


      /*
      ----------------------------------------------------------------------
      | 5. AI CORE
      ----------------------------------------------------------------------
      */

      if (!isAIConfigured()) {

        return res.status(503).json({

          success: false,

          error:
            "Senn AI is not configured yet.",

          setup: {
            required:
              "AI_API_KEY",

            message:
              "Configure the API key before using the AI Core."
          },

          analysis: {
            language,

            routing,

            context
          }

        });

      }


      const ai =
        await generateAIResponse({

          message:
            cleanMessage,

          conversation:
            context.conversation,

          languageAnalysis:
            language,

          contextPackage:
            context,

          settings,

          tools: []
        });


      /*
      ----------------------------------------------------------------------
      | 6. SAVE ASSISTANT MESSAGE
      ----------------------------------------------------------------------
      */

      const finalConversation =
        appendAssistantMessage(

          updatedConversation,

          ai.text,

          {
            model:
              ai.model,

            toolCalls:
              ai.toolCalls
          }

        );


      /*
      ----------------------------------------------------------------------
      | 7. RESPONSE
      ----------------------------------------------------------------------
      */

      return res.json({

        success: true,

        id:
          ai.id,

        message: {
          role:
            "assistant",

          content:
            ai.text
        },

        meta: {

          model:
            ai.model,

          language: {
            detected:
              language.language,

            normalized:
              language.normalizedMessage,

            slangDetected:
              language.slangDetected,

            shortMessage:
              language.isShortMessage,

            contextRequired:
              language.contextRequired
          },

          routing: {

            intent:
              routing.intent,

            tools:
              routing.tools,

            requiresTool:
              routing.requiresTool
          },

          context: {

            messages:
              context.conversation.length,

            needsContext:
              context.needsContext,

            stats:
              getConversationStats(
                finalConversation
              )
          },

          tools:
            ai.toolCalls,

          sources: []
        }

      });

    } catch (error) {

      console.error(
        "[SENN AI ERROR]",
        error
      );


      return res.status(500).json({

        success: false,

        error:
          "Senn AI mengalami kesalahan internal.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined

      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      error:
        "Endpoint tidak ditemukan."

    });

  }
);


/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "[SERVER ERROR]",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Internal server error."

    });

  }
);


/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,

  () => {

    console.log("");

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      "          SENN AI 2.0"
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      `Server : http://localhost:${PORT}`
    );

    console.log(
      `AI     : ${
        isAIConfigured()
          ? "READY"
          : "NOT CONFIGURED"
      }`
    );

    console.log(
      "Core   : READY"
    );

    console.log(
      "Router : READY"
    );

    console.log(
      "Lang   : READY"
    );

    console.log(
      "Context: READY"
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log("");

  }
);
