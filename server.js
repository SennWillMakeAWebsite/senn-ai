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

import {
  searchWeb
} from "./tools/web.js";


dotenv.config();


/*
|--------------------------------------------------------------------------
| SERVER CONFIG
|--------------------------------------------------------------------------
*/

const app = express();

const PORT =
  process.env.PORT || 3000;


const SENN = {
  name: "Senn AI",
  version: "2.0.0"
};


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
| TOOL SYSTEM
|--------------------------------------------------------------------------
|
| Semua tool yang tersedia untuk Senn
| dikontrol dari sini.
|
*/

const TOOLS = {

  web_search: async ({
    query
  }) => {

    return await searchWeb({
      query
    });

  }

};


/*
|--------------------------------------------------------------------------
| TOOL CHECKER
|--------------------------------------------------------------------------
*/

function hasTool(toolName) {

  return Boolean(
    TOOLS[toolName]
  );

}


/*
|--------------------------------------------------------------------------
| TOOL EXECUTOR
|--------------------------------------------------------------------------
|
| Executor sekarang langsung berada
| di server.js.
|
*/

async function executeTool(
  toolName,
  input = {}
) {

  if (
    !hasTool(toolName)
  ) {

    return {

      success: false,

      tool:
        toolName,

      error:
        `Tool "${toolName}" tidak tersedia.`

    };

  }


  try {

    const result =
      await TOOLS[toolName](
        input
      );


    return {

      success: true,

      tool:
        toolName,

      result

    };

  } catch (error) {

    console.error(
      `[SENN TOOL ERROR] ${toolName}`,
      error
    );


    return {

      success: false,

      tool:
        toolName,

      error:
        error.message

    };

  }

}


/*
|--------------------------------------------------------------------------
| EXECUTE TOOL PLAN
|--------------------------------------------------------------------------
*/

async function executeToolPlan({

  execution,

  message

}) {

  if (
    !execution ||
    !Array.isArray(
      execution.tools
    )
  ) {

    return {

      success: true,

      executed: [],

      results: []

    };

  }


  const results = [];


  for (
    const toolName
      of execution.tools
  ) {

    const result =
      await executeTool(

        toolName,

        {
          query:
            message,

          message
        }

      );


    results.push(
      result
    );

  }


  return {

    success:
      results.every(
        (item) =>
          item.success
      ),

    executed:
      results.map(
        (item) =>
          item.tool
      ),

    results

  };

}


/*
|--------------------------------------------------------------------------
| FORMAT TOOL RESULTS
|--------------------------------------------------------------------------
*/

function formatToolResults(
  results = []
) {

  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {

    return "";

  }


  return results
    .map(
      (item) => {

        if (
          !item.success
        ) {

          return [
            `TOOL: ${item.tool}`,
            `STATUS: ERROR`,
            `ERROR: ${item.error}`
          ].join("\n");

        }


        return [
          `TOOL: ${item.tool}`,
          `STATUS: SUCCESS`,
          "RESULT:",
          JSON.stringify(
            item.result,
            null,
            2
          )
        ].join("\n");

      }
    )
    .join("\n\n");

}


/*
|--------------------------------------------------------------------------
| HOME
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

      name:
        SENN.name,

      version:
        SENN.version,

      status:
        "online",

      aiConfigured:
        isAIConfigured(),

      availableTools:
        Object.keys(TOOLS),

      timestamp:
        new Date().toISOString()

    });

  }
);


/*
|--------------------------------------------------------------------------
| SYSTEM STATUS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/status",
  (req, res) => {

    res.json({

      success: true,

      system: {

        server:
          true,

        ai:
          isAIConfigured(),

        language:
          true,

        context:
          true,

        router:
          true,

        tools:
          Object.keys(TOOLS)

      },

      version:
        SENN.version,

      timestamp:
        new Date().toISOString()

    });

  }
);


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
      | LANGUAGE ANALYSIS
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
      | ROUTER
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
      | CONTEXT
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
      | AI CONFIG CHECK
      ----------------------------------------------------------------------
      */

      if (
        !isAIConfigured()
      ) {

        return res.status(503).json({

          success: false,

          error:
            "Senn AI belum dikonfigurasi.",

          setup: {

            required:
              "AI_API_KEY",

            message:
              "Tambahkan API key terlebih dahulu."

          },

          analysis: {

            language,

            routing,

            context

          }

        });

      }


      /*
      ----------------------------------------------------------------------
      | TOOL EXECUTION
      ----------------------------------------------------------------------
      */

      let toolExecution = {

        success: true,

        executed: [],

        results: []

      };


      if (
        routing.requiresTool
      ) {

        toolExecution =
          await executeToolPlan({

            execution:
              routing.execution,

            message:
              cleanMessage

          });

      }


      /*
      ----------------------------------------------------------------------
      | TOOL CONTEXT
      ----------------------------------------------------------------------
      */

      const toolContext =
        formatToolResults(

          toolExecution.results

        );


      /*
      ----------------------------------------------------------------------
      | ADD USER MESSAGE
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
      | AI CORE
      ----------------------------------------------------------------------
      */

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

          tools: [],

          toolContext

        });


      /*
      ----------------------------------------------------------------------
      | ADD ASSISTANT MESSAGE
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
              ai.toolCalls,

            tools:
              toolExecution.executed

          }

        );


      /*
      ----------------------------------------------------------------------
      | FINAL RESPONSE
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
              routing.requiresTool,

            execution:
              routing.execution

          },


          tools: {

            executed:
              toolExecution.executed,

            success:
              toolExecution.success,

            results:
              toolExecution.results

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


          sources:
            toolExecution.results
              .flatMap(
                (item) => {

                  if (
                    !item.success ||
                    !item.result
                  ) {

                    return [];

                  }

                  return (
                    item.result.sources ||
                    []
                  );

                }
              )

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
| START
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
      "Language : READY"
    );

    console.log(
      "Context  : READY"
    );

    console.log(
      "Router   : READY"
    );

    console.log(
      `Tools    : ${Object.keys(TOOLS).join(", ")}`
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log("");

  }
);
