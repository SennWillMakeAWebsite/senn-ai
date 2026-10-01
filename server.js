/*
|--------------------------------------------------------------------------
| SENN AI V2
| server.js
|--------------------------------------------------------------------------
*/

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();


/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

const app = express();

const PORT =
  Number(process.env.PORT) || 3000;

const AI_API_URL =
  "https://api.openai.com/v1/responses";

const AI_MODEL =
  process.env.AI_MODEL ||
  "gpt-5.6-luna";


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
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors()
);


app.use(
  express.json({
    limit: "10mb"
  })
);


/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
|
| index.html
| index.js
| style/css
| dan file frontend lainnya
| akan dilayani dari folder project.
|--------------------------------------------------------------------------
*/

app.use(
  express.static(".")
);


/*
|--------------------------------------------------------------------------
| SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

const SYSTEM_PROMPT = `
You are Senn AI 2.0.

You are a modern general-purpose AI assistant.

Understand Indonesian naturally.

The user may use:
- Indonesian slang
- abbreviations
- typos
- Indonesian-English mixtures
- very short messages
- casual language

Examples:

gw
gua
lu
lo
yg
udh
udah
blm
bgt
gmn
knp
trs
aja
ga
gak
nggak
lanjut
next
oke
y

Understand these using conversation context.

Do not force formal Indonesian.

Be natural, direct, useful, and concise.

If the user asks for coding help:
- provide practical code
- explain important parts briefly
- preserve their existing project context

If the user says:
"lanjut"
"next"
"terus"
"itu"
"yang tadi"
"gimana"
"bikin"

use previous conversation context.

Never pretend to have performed an action that you did not perform.

Never invent web sources.

If web search is available and useful, use it.

Answer in Indonesian unless the user clearly uses another language.
`;


/*
|--------------------------------------------------------------------------
| API KEY CHECK
|--------------------------------------------------------------------------
*/

function requireApiKey() {

  if (
    !process.env.AI_API_KEY
  ) {

    throw new Error(
      "AI_API_KEY belum dikonfigurasi di file .env"
    );

  }

}


/*
|--------------------------------------------------------------------------
| BUILD CONVERSATION
|--------------------------------------------------------------------------
*/

function buildConversation(
  conversation,
  message
) {

  const safeConversation =
    Array.isArray(conversation)
      ? conversation
      : [];


  /*
  |--------------------------------------------------------------------------
  | Limit context
  |--------------------------------------------------------------------------
  */

  const recent =
    safeConversation
      .filter(
        item =>
          item &&
          (
            item.role === "user" ||
            item.role === "assistant"
          )
      )
      .slice(-30)
      .map(
        item => ({

          role:
            item.role,

          content:
            typeof item.content === "string"
              ? item.content
              : String(
                  item.content ?? ""
                )

        })
      );


  /*
  |--------------------------------------------------------------------------
  | Jangan duplicate message terakhir
  |--------------------------------------------------------------------------
  */

  const last =
    recent[recent.length - 1];


  if (
    !last ||
    last.role !== "user" ||
    last.content !== message
  ) {

    recent.push({

      role: "user",

      content: message

    });

  }


  return recent;

}


/*
|--------------------------------------------------------------------------
| OPENAI REQUEST
|--------------------------------------------------------------------------
*/

async function askAI({
  message,
  conversation
}) {

  requireApiKey();


  const input =
    buildConversation(
      conversation,
      message
    );


  /*
  |--------------------------------------------------------------------------
  | RESPONSE API
  |--------------------------------------------------------------------------
  */

  const response =
    await fetch(
      AI_API_URL,
      {

        method: "POST",

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

            instructions:
              SYSTEM_PROMPT,

            input,

            store:
              false

          })

      }
    );


  /*
  |--------------------------------------------------------------------------
  | READ RESPONSE
  |--------------------------------------------------------------------------
  */

  const raw =
    await response.text();


  let data = {};

  try {

    data =
      raw
        ? JSON.parse(raw)
        : {};

  } catch {

    throw new Error(
      "OpenAI mengirim response yang bukan JSON."
    );

  }


  /*
  |--------------------------------------------------------------------------
  | API ERROR
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {

    console.error(
      "[OPENAI ERROR]",
      data
    );


    const apiMessage =
      data?.error?.message ||
      data?.message ||
      `OpenAI API error ${response.status}`;


    throw new Error(
      apiMessage
    );

  }


  /*
  |--------------------------------------------------------------------------
  | TEXT
  |--------------------------------------------------------------------------
  */

  const text =
    extractOutputText(
      data
    );


  if (!text) {

    throw new Error(
      "AI berhasil dipanggil tetapi tidak mengembalikan teks."
    );

  }


  return {

    text,

    responseId:
      data.id ||
      null,

    model:
      data.model ||
      AI_MODEL

  };

}


/*
|--------------------------------------------------------------------------
| EXTRACT OUTPUT TEXT
|--------------------------------------------------------------------------
*/

function extractOutputText(
  data
) {

  /*
  |--------------------------------------------------------------------------
  | Responses API biasanya menyediakan output_text
  |--------------------------------------------------------------------------
  */

  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {

    return data.output_text.trim();

  }


  /*
  |--------------------------------------------------------------------------
  | Fallback parser
  |--------------------------------------------------------------------------
  */

  const output =
    Array.isArray(data?.output)
      ? data.output
      : [];


  const parts = [];


  for (
    const item of output
  ) {

    if (
      !Array.isArray(
        item?.content
      )
    ) {

      continue;

    }


    for (
      const content
      of item.content
    ) {

      if (
        typeof content?.text === "string"
      ) {

        parts.push(
          content.text
        );

      }

    }

  }


  return parts
    .join("\n")
    .trim();

}


/*
|--------------------------------------------------------------------------
| EXTRACT SOURCES
|--------------------------------------------------------------------------
*/

function extractSources(
  data
) {

  const sources = [];


  const output =
    Array.isArray(data?.output)
      ? data.output
      : [];


  for (
    const item
    of output
  ) {

    if (
      !Array.isArray(
        item?.content
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


  /*
  |--------------------------------------------------------------------------
  | Remove duplicates
  |--------------------------------------------------------------------------
  */

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
| HOME
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  function (req, res) {

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

      model:
        AI_MODEL,

      endpoints: {

        chat:
          "/api/chat",

        status:
          "/api/status"

      },

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
  function (req, res) {

    res.json({

      success:
        true,

      status:
        "online",

      system: {

        server:
          true,

        ai:
          Boolean(
            process.env.AI_API_KEY
          ),

        chat:
          true,

        context:
          true

      },

      senn: {

        name:
          SENN.name,

        version:
          SENN.version,

        model:
          AI_MODEL

      },

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
  async function (req, res) {

    try {

      /*
      |--------------------------------------------------------------------------
      | REQUEST
      |--------------------------------------------------------------------------
      */

      const {
        message,
        conversation
      } = req.body || {};


      /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        typeof message !== "string"
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "message harus berupa string."

          });

      }


      const cleanMessage =
        message.trim();


      if (!cleanMessage) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Message tidak boleh kosong."

          });

      }


      console.log(
        `[SENN CHAT] ${cleanMessage}`
      );


      /*
      |--------------------------------------------------------------------------
      | AI
      |--------------------------------------------------------------------------
      */

      const result =
        await askAI({

          message:
            cleanMessage,

          conversation:
            conversation

        });


      /*
      |--------------------------------------------------------------------------
      | SOURCES
      |--------------------------------------------------------------------------
      */

      /*
      | askAI hanya mengembalikan data ringkas.
      | Sources kosong untuk request normal.
      |
      | Web search akan kita aktifkan setelah
      | chat dasar sudah benar-benar stabil.
      */

      const sources = [];


      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.json({

        success:
          true,

        answer:
          result.text,

        text:
          result.text,

        responseId:
          result.responseId,

        model:
          result.model,

        sources,

        timestamp:
          new Date().toISOString()

      });


    } catch (error) {

      console.error(
        "[SENN CHAT ERROR]",
        error
      );


      /*
      |--------------------------------------------------------------------------
      | ERROR RESPONSE
      |--------------------------------------------------------------------------
      */

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.message ||
            "Senn mengalami kesalahan pada server."

        });

    }

  }
);


/*
|--------------------------------------------------------------------------
| 404 API
|--------------------------------------------------------------------------
*/

app.use(
  "/api",
  function (req, res) {

    res
      .status(404)
      .json({

        success:
          false,

        error:
          `API endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`

      });

  }
);


/*
|--------------------------------------------------------------------------
| GLOBAL ERROR
|--------------------------------------------------------------------------
*/

app.use(
  function (error, req, res, next) {

    console.error(
      "[SENN GLOBAL ERROR]",
      error
    );


    if (
      res.headersSent
    ) {

      return next(error);

    }


    res
      .status(500)
      .json({

        success:
          false,

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
  function () {

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "        SENN AI V2 SERVER"
    );
    console.log(
      "======================================"
    );
    console.log(
      `Name    : ${SENN.name}`
    );
    console.log(
      `Version : ${SENN.version}`
    );
    console.log(
      `Model   : ${AI_MODEL}`
    );
    console.log(
      `Port    : ${PORT}`
    );
    console.log(
      `AI Key  : ${
        process.env.AI_API_KEY
          ? "CONNECTED"
          : "MISSING"
      }`
    );
    console.log(
      "======================================"
    );
    console.log("");

  }
);  const timeWords = [

    "jam berapa",
    "waktu sekarang",
    "jam sekarang"

  ];


  if (
    timeWords.some(
      word =>
        text.includes(word)
    )
  ) {

    return {

      primary:
        "time",

      tools:
        [
          "time"
        ],

      reason:
        "current_time",

      confidence:
        0.99

    };

  }


  return route;

}


/*
|--------------------------------------------------------------------------
| CONTEXT BUILDER
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
      item =>
        item &&
        (
          item.role ===
            "user"
          ||
          item.role ===
            "assistant"
        )
    )
    .map(
      item => ({

        role:
          item.role,

        content:
          typeof item.content ===
          "string"
            ? item.content
            : JSON.stringify(
                item.content
              )

      })
    );

}


/*
|--------------------------------------------------------------------------
| CALCULATOR
|--------------------------------------------------------------------------
*/

function calculate(
  expression
) {

  let safe =
    String(
      expression || ""
    );


  safe =
    safe
      .replace(
        /,/g,
        "."
      )
      .replace(
        /[^0-9+\-*/().%\s]/g,
        ""
      )
      .trim();


  if (!safe) {

    throw new Error(
      "Ekspresi matematika tidak valid."
    );

  }


  if (
    safe.length > 100
  ) {

    throw new Error(
      "Ekspresi terlalu panjang."
    );

  }


  /*
  |--------------------------------------------------------------------------
  | SECURITY
  |--------------------------------------------------------------------------
  |
  | Hanya karakter matematika yang lolos.
  |
  */

  try {

    const result =
      Function(
        `"use strict"; return (${safe})`
      )();


    if (
      typeof result !==
        "number"
      ||
      !Number.isFinite(
        result
      )
    ) {

      throw new Error();

    }


    return {

      expression:
        safe,

      result

    };

  } catch {

    throw new Error(
      "Ekspresi tidak dapat dihitung."
    );

  }

}


/*
|--------------------------------------------------------------------------
| WEB SEARCH
|--------------------------------------------------------------------------
*/

async function webSearch(
  query
) {

  if (
    !hasAIKey()
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
              SENN.model,

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

    text:
      data.output_text ||
      "",

    sources:
      extractSources(
        data
      ),

    responseId:
      data.id ||
      null

  };

}


/*
|--------------------------------------------------------------------------
| SOURCE EXTRACTION
|--------------------------------------------------------------------------
*/

function extractSources(
  data
) {

  const sources =
    [];


  const output =
    Array.isArray(
      data?.output
    )
      ? data.output
      : [];


  for (
    const item
    of output
  ) {

    if (
      !Array.isArray(
        item?.content
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
          &&
          annotation?.url
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

      sources.map(
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
| TIME
|--------------------------------------------------------------------------
*/

function getTime() {

  const now =
    new Date();


  return {

    iso:
      now.toISOString(),

    local:
      now.toLocaleString(
        "id-ID",
        {
          timeZone:
            "Asia/Jakarta"
        }
      ),

    timezone:
      "Asia/Jakarta"

  };

}


/*
|--------------------------------------------------------------------------
| WEATHER PLACEHOLDER
|--------------------------------------------------------------------------
*/

async function getWeather(
  query
) {

  /*
  |--------------------------------------------------------------------------
  | Provider cuaca belum dipasang.
  |--------------------------------------------------------------------------
  |
  | Jangan mengarang data cuaca.
  |
  */

  return {

    available:
      false,

    location:
      query ||
      null,

    message:
      "Weather provider belum terhubung."

  };

}


/*
|--------------------------------------------------------------------------
| TOOL EXECUTION
|--------------------------------------------------------------------------
*/

async function executeTools(
  tools,
  message
) {

  const results =
    [];


  for (
    const tool
    of tools
  ) {

    try {

      if (
        tool ===
        "calculator"
      ) {

        results.push({

          tool,

          success:
            true,

          result:
            calculate(
              message
            )

        });

        continue;

      }


      if (
        tool ===
        "web_search"
      ) {

        results.push({

          tool,

          success:
            true,

          result:
            await webSearch(
              message
            )

        });

        continue;

      }


      if (
        tool ===
        "time"
      ) {

        results.push({

          tool,

          success:
            true,

          result:
            getTime()

        });

        continue;

      }


      if (
        tool ===
        "weather"
      ) {

        results.push({

          tool,

          success:
            true,

          result:
            await getWeather(
              message
            )

        });

        continue;

      }


      results.push({

        tool,

        success:
          false,

        error:
          "Tool tidak dikenal."

      });

    } catch (
      error
    ) {

      results.push({

        tool,

        success:
          false,

        error:
          error.message

      });

    }

  }


  return results;

}


/*
|--------------------------------------------------------------------------
| TOOL CONTEXT
|--------------------------------------------------------------------------
*/

function createToolContext(
  results
) {

  if (
    !results.length
  ) {

    return "";

  }


  return results
    .map(
      item => {

        return [

          `TOOL: ${item.tool}`,

          `SUCCESS: ${item.success}`,

          item.success
            ? `RESULT:\n${JSON.stringify(
                item.result,
                null,
                2
              )}`
            : `ERROR:\n${item.error}`

        ].join("\n");

      }
    )
    .join(
      "\n\n"
    );

}


/*
|--------------------------------------------------------------------------
| AI RESPONSE
|--------------------------------------------------------------------------
*/

async function generateAI({
  message,
  conversation,
  language,
  router,
  toolResults
}) {

  if (
    !hasAIKey()
  ) {

    throw new Error(
      "AI_API_KEY belum dikonfigurasi."
    );

  }


  const context =
    buildContext(
      conversation
    );


  const toolContext =
    createToolContext(
      toolResults
    );


  const developerInstructions = `

${SYSTEM_PROMPT}

SENN ROUTING:

${JSON.stringify(
  router,
  null,
  2
)}

LANGUAGE ANALYSIS:

${JSON.stringify(
  language,
  null,
  2
)}

TOOL RESULTS:

${toolContext || "Tidak ada tool yang digunakan."}

IMPORTANT:

The routing information and tool results are internal.

Do not expose them to the user.

Use them to produce the best answer.

`;


  const input = [

    ...context,

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
              SENN.model,

            instructions:
              developerInstructions,

            input,

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
      `AI request gagal (${response.status}): ${errorText}`
    );

  }


  const  ];


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
      | TOOL EXECUT ];


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
