import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

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
| AI CONFIG
|--------------------------------------------------------------------------
*/

const AI_API_URL =
  "https://api.openai.com/v1/responses";

const AI_MODEL =
  process.env.AI_MODEL ||
  "gpt-5.6-luna";


/*
|--------------------------------------------------------------------------
| SENN SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

const SYSTEM_PROMPT = `
You are Senn AI 2.0.

You are a general-purpose AI assistant.

IMPORTANT:

Understand Indonesian naturally.

The user may use:
- slang
- abbreviations
- typos
- Indonesian-English mixtures
- very short messages

Examples:

y
ok
oke
gmn
gmw
ga
gak
yg
udah
udh
blm
bgt
aja
knp
trs
lanjut
next

Interpret these based on conversation context.

Do not force formal language.

CONVERSATION:

Use previous messages when necessary.

If the user says:

"lanjut"
"next"
"terus?"
"itu"
"yang tadi"
"gimana?"
"bikin"

use the previous conversation to understand what they mean.

WEB:

When web search results are provided, use them.

Do not invent information.

Do not claim that information is current unless
current information was actually retrieved.

If sources are available, preserve their meaning.

GENERAL:

Answer naturally.

Be useful.

Be direct.

Do not unnecessarily repeat the user's question.
`;


/*
|--------------------------------------------------------------------------
| TOOL REGISTRY
|--------------------------------------------------------------------------
|
| Semua tool Senn sementara berada langsung
| di server.js.
|
|--------------------------------------------------------------------------
*/

const TOOLS = {

  /*
  |--------------------------------------------------------------------------
  | WEB SEARCH
  |--------------------------------------------------------------------------
  */

  web_search: {

    description:
      "Mencari informasi terkini dari internet.",

    requiresInternet:
      true,

    execute:
      async ({ query }) => {

        if (
          !query ||
          typeof query !== "string"
        ) {

          throw new Error(
            "Search query tidak valid."
          );

        }


        if (
          !process.env.AI_API_KEY
        ) {

          throw new Error(
            "AI_API_KEY belum dikonfigurasi."
          );

        }


        const response =
          await fetch(
            AI_API_URL,
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${process.env.AI_API_KEY}`

              },

              body:
                JSON.stringify({

                  model:
                    AI_MODEL,

                  tools: [

                    {
                      type:
                        "web_search"
                    }

                  ],

                  input:
                    query,

                  store:
                    false

                })

            }
          );


        if (
          !response.ok
        ) {

          const errorText =
            await response.text();

          throw new Error(
            `Web search gagal (${response.status}): ${errorText}`
          );

        }


        const data =
          await response.json();


        return {

          answer:
            data.output_text ||
            "",

          sources:
            extractSources(data),

          responseId:
            data.id ||
            null

        };

      }

  },


  /*
  |--------------------------------------------------------------------------
  | CALCULATOR
  |--------------------------------------------------------------------------
  */

  calculator: {

    description:
      "Menghitung operasi matematika.",

    requiresInternet:
      false,

    execute:
      async ({ query }) => {

        if (
          !query ||
          typeof query !== "string"
        ) {

          throw new Error(
            "Ekspresi matematika tidak valid."
          );

        }


        const expression =
          query
            .replace(
              /[^0-9+\-*/().%\s]/g,
              ""
            )
            .trim();


        if (!expression) {

          throw new Error(
            "Tidak ditemukan angka atau operasi."
          );

        }


        try {

          const result =
            Function(
              `"use strict"; return (${expression})`
            )();


          if (
            typeof result !== "number" ||
            !Number.isFinite(result)
          ) {

            throw new Error(
              "Hasil tidak valid."
            );

          }


          return {

            expression,

            result

          };

        } catch {

          throw new Error(
            "Ekspresi matematika tidak dapat dihitung."
          );

        }

      }

  },


  /*
  |--------------------------------------------------------------------------
  | TIME
  |--------------------------------------------------------------------------
  */

  time: {

    description:
      "Mendapatkan waktu saat ini.",

    requiresInternet:
      false,

    execute:
      async () => {

        const now =
          new Date();

        return {

          iso:
            now.toISOString(),

          utc:
            now.toUTCString(),

          timestamp:
            now.getTime()

        };

      }

  },


  /*
  |--------------------------------------------------------------------------
  | WEATHER
  |--------------------------------------------------------------------------
  */

  weather: {

    description:
      "Mendapatkan informasi cuaca.",

    requiresInternet:
      true,

    execute:
      async ({ query }) => {

        return {

          status:
            "not_connected",

          location:
            query || null,

          message:
            "Weather provider belum dihubungkan."

        };

      }

  }

};


/*
|--------------------------------------------------------------------------
| WEB SOURCE EXTRACTION
|--------------------------------------------------------------------------
*/

function extractSources(data) {

  const sources = [];

  const output =
    Array.isArray(data?.output)
      ? data.output
      : [];


  for (
    const item of output
  ) {

    if (
      item?.type !== "message"
    ) {

      continue;

    }


    if (
      !Array.isArray(
        item.content
      )
    ) {

      continue;

    }


    for (
      const content
      of item.content
    ) {

      const annotations =
        Array.isArray(
          content?.annotations
        )
          ? content.annotations
          : [];


      for (
        const annotation
        of annotations
      ) {

        if (
          annotation?.type ===
          "url_citation"
        ) {

          sources.push({

            title:
              annotation.title ||
              "Web Source",

            url:
              annotation.url

          });

        }

      }

    }

  }


  return [
    ...new Map(

      sources
        .filter(
          source =>
            source.url
        )
        .map(
          source => [
            source.url,
            source
          ]
        )

    ).values()
  ];

}


/*
|--------------------------------------------------------------------------
| TOOL DETECTION
|--------------------------------------------------------------------------
*/

function detectTools(message) {

  const text =
    message
      .toLowerCase()
      .trim();


  const tools = [];


  /*
  |--------------------------------------------------------------------------
  | WEB
  |--------------------------------------------------------------------------
  */

  const webKeywords = [

    "berita",
    "terbaru",
    "terkini",
    "hari ini",
    "sekarang",
    "update",
    "harga",
    "jadwal",
    "cari",
    "search",
    "google",
    "internet",
    "siapa",
    "kapan",
    "dimana",
    "di mana"

  ];


  if (
    webKeywords.some(
      keyword =>
        text.includes(keyword)
    )
  ) {

    tools.push(
      "web_search"
    );

  }


  /*
  |--------------------------------------------------------------------------
  | CALCULATOR
  |--------------------------------------------------------------------------
  */

  const calculatorKeywords = [

    "hitung",
    "kalkulasi",
    "calculate",
    "berapa hasil"

  ];


  const containsMath =
    /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/
      .test(text);


  if (
    calculatorKeywords.some(
      keyword =>
        text.includes(keyword)
    ) ||
    containsMath
  ) {

    tools.push(
      "calculator"
    );

  }


  /*
  |--------------------------------------------------------------------------
  | TIME
  |--------------------------------------------------------------------------
  */

  const timeKeywords = [

    "jam berapa",
    "waktu sekarang",
    "sekarang jam"

  ];


  if (
    timeKeywords.some(
      keyword =>
        text.includes(keyword)
    )
  ) {

    tools.push(
      "time"
    );

  }


  /*
  |--------------------------------------------------------------------------
  | WEATHER
  |--------------------------------------------------------------------------
  */

  const weatherKeywords = [

    "cuaca",
    "hujan",
    "suhu",
    "weather"

  ];


  if (
    weatherKeywords.some(
      keyword =>
        text.includes(keyword)
    )
  ) {

    tools.push(
      "weather"
    );

  }


  return [
    ...new Set(tools)
  ];

}


/*
|--------------------------------------------------------------------------
| INTENT DETECTION
|--------------------------------------------------------------------------
*/

function detectIntent(message) {

  const text =
    message
      .toLowerCase()
      .trim();


  if (!text) {

    return "empty";

  }


  if (
    text.includes("?") ||
    /^(apa|kenapa|bagaimana|gimana|siapa|kapan|dimana|di mana)\b/
      .test(text)
  ) {

    return "question";

  }


  if (
    /^(buat|bikin|buatkan|bikinin)\b/
      .test(text)
  ) {

    return "creation";

  }


  if (
    text.includes("error") ||
    text.includes("bug") ||
    text.includes("rusak") ||
    text.includes("gak jalan") ||
    text.includes("ga jalan")
  ) {

    return "debugging";

  }


  if (
    text.includes("jelasin") ||
    text.includes("jelaskan") ||
    text.includes("explain")
  ) {

    return "explanation";

  }


  return "conversation";

}


/*
|--------------------------------------------------------------------------
| LANGUAGE / SHORT MESSAGE ANALYSIS
|--------------------------------------------------------------------------
*/

function analyzeLanguage(
  message,
  conversation = []
) {

  const text =
    message
      .toLowerCase()
      .trim();


  const slangMap = {

    "gmn":
      "gimana",

    "gmw":
      "nggak mau",

    "ga":
      "tidak",

    "gak":
      "tidak",

    "yg":
      "yang",

    "udh":
      "sudah",

    "udah":
      "sudah",

    "blm":
      "belum",

    "bgt":
      "banget",

    "knp":
      "kenapa",

    "trs":
      "terus",

    "aja":
      "saja"

  };


  let normalized =
    text;


  const detectedSlang = [];


  for (
    const [
      slang,
      replacement
    ]
    of Object.entries(
      slangMap
    )
  ) {

    const regex =
      new RegExp(
        `\\b${slang}\\b`,
        "gi"
      );


    if (
      regex.test(
        normalized
      )
    ) {

      detectedSlang.push(
        slang
      );


      normalized =
        normalized.replace(
          regex,
          replacement
        );

    }

  }


  const shortMessages = [

    "y",
    "ya",
    "ok",
    "oke",
    "iya",
    "lanjut",
    "next",
    "terus",
    "gmn",
    "gmw"

  ];


  const isShortMessage =
    shortMessages.includes(
      text
    ) ||
    text.length <= 3;


  return {

    language:
      /[a-zA-Z]/.test(text)
        ? "id"
        : "unknown",

    originalMessage:
      message,

    normalizedMessage:
      normalized,

    slangDetected:
      detectedSlang,

    isShortMessage,

    contextRequired:
      isShortMessage &&
      conversation.length > 0

  };

}


/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

function buildContext(
  conversation = []
) {

  if (
    !Array.isArray(
      conversation
    )
  ) {

    return [];

  }


  return conversation
    .slice(-20)
    .filter(
      message =>
        message &&
        (
          message.role ===
            "user" ||
          message.role ===
            "assistant" ||
          message.role ===
            "system"
        )
    )
    .map(
      message => ({

        role:
          message.role,

        content:
          typeof message.content ===
          "string"
            ? message.content
            : JSON.stringify(
                message.content
              )

      })
    );

}


/*
|--------------------------------------------------------------------------
| EXECUTE TOOLS
|--------------------------------------------------------------------------
*/

async function executeTools(
  toolNames,
  message
) {

  const results = [];


  for (
    const toolName
    of toolNames
  ) {

    const tool =
      TOOLS[toolName];


    if (!tool) {

      results.push({

        success:
          false,

        tool:
          toolName,

        error:
          "Tool tidak ditemukan."

      });

      continue;

    }


    try {

      const result =
        await tool.execute({

          query:
            message,

          message

        });


      results.push({

        success:
          true,

        tool:
          toolName,

        result

      });

    } catch (error) {

      console.error(
        `[TOOL ERROR] ${toolName}`,
        error
      );


      results.push({

        success:
          false,

        tool:
          toolName,

        error:
          error.message

      });

    }

  }


  return results;

}


/*
|--------------------------------------------------------------------------
| FORMAT TOOL CONTEXT
|--------------------------------------------------------------------------
*/

function formatToolContext(
  results
) {

  if (
    !results.length
  ) {

    return "";

  }


  return results
    .map(
      result => {

        if (
          !result.success
        ) {

          return `
TOOL: ${result.tool}
STATUS: ERROR
ERROR: ${result.error}
`;

        }


        return `
TOOL: ${result.tool}
STATUS: SUCCESS

RESULT:
${JSON.stringify(
  result.result,
  null,
  2
)}
`;

      }
    )
    .join("\n");

}


/*
|--------------------------------------------------------------------------
| AI REQUEST
|--------------------------------------------------------------------------
*/

async function generateAI({

  message,

  conversation,

  language,

  toolContext

}) {

  if (
    !process.env.AI_API_KEY
  ) {

    throw new Error(
      "AI_API_KEY belum dikonfigurasi."
    );

  }


  const instructions = `

${SYSTEM_PROMPT}

LANGUAGE ANALYSIS:

${JSON.stringify(
  language,
  null,
  2
)}

EXTERNAL TOOL RESULTS:

${toolContext || "Tidak ada."}

`;

  
  const input = [

    ...conversation,

    {

      role:
        "user",

      content:
        message

    }

  ];


  const response =
    await fetch(
      AI_API_URL,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${process.env.AI_API_KEY}`

        },

        body:
          JSON.stringify({

            model:
              AI_MODEL,

            instructions,

            input,

            store:
              false

          })

      }
    );


  if (
    !response.ok
  ) {

    const error =
      await response.text();


    throw new Error(
      `AI request gagal (${response.status}): ${error}`
    );

  }


  const data =
    await response.json();


  return {

    id:
      data.id ||
      null,

    model:
      data.model ||
      AI_MODEL,

    text:
      data.output_text ||
      "Senn tidak menerima jawaban.",

    raw:
      data

  };

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

      success:
        true,

      name:
        SENN.name,

      version:
        SENN.version,

      status:
        "online",

      ai:
        Boolean(
          process.env.AI_API_KEY
        ),

      tools:
        Object.keys(
          TOOLS
        ),

      timestamp:
        new Date().toISOString()

    });

  }
);


/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/status",
  (req, res) => {

    res.json({

      success:
        true,

      system: {

        server:
          true,

        ai:
          Boolean(
            process.env.AI_API_KEY
          ),

        language:
          true,

        context:
          true,

        router:
          true,

        tools:
          Object.keys(
            TOOLS
          )

      },

      version:
        SENN.version

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

  async (
    req,
    res
  ) => {

    try {

      const {

        message,

        conversation = []

      } = req.body;


      /*
      ----------------------------------------------------------------------
      | VALIDATION
      ----------------------------------------------------------------------
      */

      if (
        typeof message !==
          "string" ||
        !message.trim()
      ) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Message tidak boleh kosong."

        });

      }


      const cleanMessage =
        message.trim();


      /*
      ----------------------------------------------------------------------
      | LANGUAGE
      ----------------------------------------------------------------------
      */

      const language =
        analyzeLanguage(

          cleanMessage,

          conversation

        );


      /*
      ----------------------------------------------------------------------
      | ROUTER
      ----------------------------------------------------------------------
      */

      const intent =
        detectIntent(
          cleanMessage
        );


      const detectedTools =
        detectTools(
          cleanMessage
        );


      /*
      ----------------------------------------------------------------------
      | CONTEXT
      ----------------------------------------------------------------------
      */

      const context =
        buildContext(
          conversation
        );


      /*
      ----------------------------------------------------------------------
      | TOOL EXECUT   updatedConversation,

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
