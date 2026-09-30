/**
 * SENN AI 2.0
 * AI Core
 *
 * Tugas:
 * - mengirim request ke AI provider
 * - membawa context percakapan
 * - membawa hasil tool
 * - menghasilkan jawaban final
 */

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";


const DEFAULT_MODEL =
  process.env.AI_MODEL ||
  "gpt-5.6-luna";


/*
|--------------------------------------------------------------------------
| SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

const SENN_SYSTEM_PROMPT = `
You are Senn AI.

You are a general-purpose AI assistant.

Your job is to:
- understand the user's actual intent
- understand informal Indonesian
- understand abbreviations and slang
- maintain conversation context
- use external tool results when provided
- answer clearly and naturally
- avoid inventing facts
- distinguish current information from general knowledge
- use web results when they are available
- never pretend that a tool was used when it was not

LANGUAGE:

The user may write:
- Indonesian
- English
- mixed Indonesian-English
- slang
- abbreviations
- typos
- very short messages

Examples:

"y"
"ok"
"gmn"
"gmw"
"ga"
"gak"
"yg"
"udh"
"udah"
"blm"
"bgt"
"aja"
"knp"
"trs"
"lanjut"
"next"

Understand these based on context.

Do not force formal Indonesian unless the user asks for it.

CONTEXT:

Previous messages are important.

If the user says:
"terus?"
"lanjut"
"yang tadi"
"itu"
"gimana?"
"bikin"
"next"

interpret them using the conversation context.

WEB INFORMATION:

If external tool results are provided, use them as factual context.

Do not invent sources.

Do not claim something is current unless current information was actually obtained.

If sources are available, preserve their meaning.

RESPONSE STYLE:

Be useful.

Be direct.

Avoid unnecessary explanations.

Match the user's language naturally.

Do not repeat the user's entire question unnecessarily.
`;


/*
|--------------------------------------------------------------------------
| API KEY CHECK
|--------------------------------------------------------------------------
*/

export function isAIConfigured() {

  return Boolean(
    process.env.AI_API_KEY
  );

}


/*
|--------------------------------------------------------------------------
| BUILD INSTRUCTIONS
|--------------------------------------------------------------------------
*/

function buildInstructions({

  languageAnalysis = null,

  contextPackage = null,

  settings = {},

  toolContext = ""

}) {

  const sections = [

    SENN_SYSTEM_PROMPT

  ];


  /*
  |--------------------------------------------------------------------------
  | LANGUAGE
  |--------------------------------------------------------------------------
  */

  if (
    languageAnalysis
  ) {

    sections.push(`

LANGUAGE ANALYSIS:

${JSON.stringify(
  languageAnalysis,
  null,
  2
)}

`);

  }


  /*
  |--------------------------------------------------------------------------
  | CONTEXT
  |--------------------------------------------------------------------------
  */

  if (
    contextPackage
  ) {

    sections.push(`

CONVERSATION CONTEXT:

${JSON.stringify(
  contextPackage,
  null,
  2
)}

`);

  }


  /*
  |--------------------------------------------------------------------------
  | SETTINGS
  |--------------------------------------------------------------------------
  */

  if (
    settings &&
    Object.keys(settings).length
  ) {

    sections.push(`

USER SETTINGS:

${JSON.stringify(
  settings,
  null,
  2
)}

`);

  }


  /*
  |--------------------------------------------------------------------------
  | TOOL RESULTS
  |--------------------------------------------------------------------------
  */

  if (
    toolContext &&
    toolContext.trim()
  ) {

    sections.push(`

EXTERNAL TOOL RESULTS:

The following information was retrieved
from an external tool.

Use it when answering the user.

Do not invent information that is not
supported by these results.

${toolContext}

`);

  }


  return sections.join("\n");

}


/*
|--------------------------------------------------------------------------
| CONVERSATION FORMATTER
|--------------------------------------------------------------------------
*/

function formatConversation(
  conversation = []
) {

  if (
    !Array.isArray(conversation)
  ) {

    return [];

  }


  return conversation
    .filter(
      (message) =>
        message &&
        (
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "system"
        )
    )
    .map(
      (message) => ({

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
| EXTRACT RESPONSE TEXT
|--------------------------------------------------------------------------
*/

function extractResponseText(
  data
) {

  if (
    typeof data?.output_text ===
    "string"
  ) {

    return data.output_text;

  }


  const output =
    Array.isArray(data?.output)
      ? data.output
      : [];


  const parts = [];


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

      if (
        content?.type ===
        "output_text"
      ) {

        if (
          typeof content.text ===
          "string"
        ) {

          parts.push(
            content.text
          );

        }

      }

    }

  }


  return parts.join("\n").trim();

}


/*
|--------------------------------------------------------------------------
| GENERATE AI RESPONSE
|--------------------------------------------------------------------------
*/

export async function generateAIResponse({

  message,

  conversation = [],

  languageAnalysis = null,

  contextPackage = null,

  settings = {},

  tools = [],

  toolContext = "",

  model = DEFAULT_MODEL

}) {

  if (
    !isAIConfigured()
  ) {

    throw new Error(
      "AI_API_KEY is not configured."
    );

  }


  /*
  |--------------------------------------------------------------------------
  | INSTRUCTIONS
  |--------------------------------------------------------------------------
  */

  const instructions =
    buildInstructions({

      languageAnalysis,

      contextPackage,

      settings,

      toolContext

    });


  /*
  |--------------------------------------------------------------------------
  | CONVERSATION
  |--------------------------------------------------------------------------
  */

  const history =
    formatConversation(
      conversation
    );


  /*
  |--------------------------------------------------------------------------
  | CURRENT USER MESSAGE
  |--------------------------------------------------------------------------
  */

  const input = [

    ...history,

    {

      role:
        "user",

      content:
        message

    }

  ];


  /*
  |--------------------------------------------------------------------------
  | REQUEST
  |--------------------------------------------------------------------------
  */

  const body = {

    model,

    instructions,

    input,

    store: false

  };


  /*
  |--------------------------------------------------------------------------
  | OPTIONAL TOOLS
  |--------------------------------------------------------------------------
  |
  | Tool execution saat ini dilakukan
  | oleh server.js.
  |
  | Array ini sengaja tidak langsung
  | mengaktifkan tools provider.
  |
  */

  if (
    Array.isArray(tools) &&
    tools.length > 0
  ) {

    body.tools =
      tools;

  }


  /*
  |--------------------------------------------------------------------------
  | API REQUEST
  |--------------------------------------------------------------------------
  */

  const response =
    await fetch(
      OPENAI_API_URL,
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
          JSON.stringify(
            body
          )

      }

    );


  /*
  |--------------------------------------------------------------------------
  | API ERROR
  |--------------------------------------------------------------------------
  */

  if (
    !response.ok
  ) {

    const errorText =
      await response.text();


    throw new Error(
      `AI request failed (${response.status}): ${errorText}`
    );

  }


  /*
  |--------------------------------------------------------------------------
  | RESPONSE
  |--------------------------------------------------------------------------
  */

  const data =
    await response.json();


  const text =
    extractResponseText(
      data
    );


  /*
  |--------------------------------------------------------------------------
  | FINAL RESULT
  |--------------------------------------------------------------------------
  */

  return {

    id:
      data.id ||
      null,

    text:
      text ||
      "Senn belum menerima jawaban dari AI.",

    model:
      data.model ||
      model,

    toolCalls:
      [],

    raw:
      data

  };

}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export {
  buildInstructions,
  formatConversation,
  extractResponseText
};
