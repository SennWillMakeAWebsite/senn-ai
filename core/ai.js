/**
 * SENN AI 2.0
 * AI Core
 *
 * Tugas:
 * - menghubungkan Senn dengan AI model
 * - membangun system instructions
 * - memasukkan conversation context
 * - memasukkan hasil Language Layer
 * - menyiapkan tool support
 * - menghasilkan response terstruktur
 */

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_MODEL =
  process.env.AI_MODEL || "gpt-5.6-luna";


/*
|--------------------------------------------------------------------------
| SENN SYSTEM IDENTITY
|--------------------------------------------------------------------------
*/

const SENN_SYSTEM_PROMPT = `
You are Senn AI.

You are an intelligent general-purpose AI assistant
created as part of the Senn AI project.

CORE BEHAVIOR:
- Understand natural human language.
- Understand Indonesian informal chat.
- Understand abbreviations, slang, typos, mixed Indonesian-English,
  and short contextual messages.
- Preserve the user's intended meaning.
- Use previous conversation context when necessary.
- Do not invent facts when reliable information is unavailable.
- When tools are available and appropriate, use them.
- Give clear, useful, direct answers.
- Match the user's language naturally.
- Do not unnecessarily formalize casual Indonesian.
- Do not mention internal system architecture unless asked.

LANGUAGE:
The user may write things such as:
"gmn", "udh", "blm", "gmw", "ga", "yg", "klo",
"bgt", "bikin", "gas", "ok", "y", or other informal forms.

Understand their meaning from context.

IMPORTANT:
The original user message is authoritative.
Language normalization is only an interpretation aid.

CONTEXT:
A short message may depend heavily on previous messages.
Examples:
"gunanya?"
"terus?"
"yang tadi?"
"ok"
"y"
"gmn?"

Use conversation context to understand these messages.

RESPONSE STYLE:
- Be concise when the question is simple.
- Be detailed when the task requires detail.
- Explain technical subjects clearly.
- If the user asks for code, provide usable code.
- Do not fabricate sources, facts, tool results, or actions.
`;


/*
|--------------------------------------------------------------------------
| BUILD INSTRUCTIONS
|--------------------------------------------------------------------------
*/

function buildInstructions({
  languageAnalysis = null,
  contextPackage = null,
  settings = {}
}) {

  const languageInfo =
    languageAnalysis
      ? `
LANGUAGE ANALYSIS:
${JSON.stringify(
  languageAnalysis,
  null,
  2
)}
`
      : "";

  const contextInfo =
    contextPackage
      ? `
CONTEXT PACKAGE:
${JSON.stringify(
  contextPackage,
  null,
  2
)}
`
      : "";

  const settingsInfo =
    Object.keys(settings).length > 0
      ? `
USER SETTINGS:
${JSON.stringify(
  settings,
  null,
  2
)}
`
      : "";

  return [
    SENN_SYSTEM_PROMPT,
    languageInfo,
    contextInfo,
    settingsInfo
  ].join("\n");
}


/*
|--------------------------------------------------------------------------
| CONVERSATION → RESPONSES API INPUT
|--------------------------------------------------------------------------
*/

function buildInput({
  conversation = [],
  message
}) {

  const input = [];

  for (const item of conversation) {

    if (
      !item ||
      !item.role ||
      typeof item.content !== "string"
    ) {
      continue;
    }

    /*
     * Tool messages akan kita tangani lebih
     * lanjut ketika Tool Engine dibuat.
     */

    input.push({
      role: item.role,
      content: item.content
    });
  }

  /*
   * Current user message
   */
  input.push({
    role: "user",
    content: message
  });

  return input;
}


/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

async function requestOpenAI({
  model,
  instructions,
  input,
  tools = []
}) {

  const apiKey =
    process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY is not configured."
    );
  }

  const body = {
    model,

    instructions,

    input,

    tools,

    store: false
  };

  const response =
    await fetch(
      OPENAI_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`
        },

        body:
          JSON.stringify(body)
      }
    );

  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      `OpenAI API ${response.status}: ${errorText}`
    );
  }

  return response.json();
}


/*
|--------------------------------------------------------------------------
| EXTRACT RESPONSE TEXT
|--------------------------------------------------------------------------
*/

function extractResponseText(
  response
) {

  if (
    typeof response?.output_text ===
    "string"
  ) {
    return response.output_text;
  }

  /*
   * Fallback parser.
   */
  const output =
    Array.isArray(response?.output)
      ? response.output
      : [];

  const textParts = [];

  for (const item of output) {

    if (
      item?.type === "message" &&
      Array.isArray(item.content)
    ) {

      for (
        const content of item.content
      ) {

        if (
          content?.type ===
          "output_text"
        ) {

          textParts.push(
            content.text
          );
        }
      }
    }
  }

  return textParts.join("\n").trim();
}


/*
|--------------------------------------------------------------------------
| EXTRACT TOOL INFORMATION
|--------------------------------------------------------------------------
*/

function extractToolCalls(
  response
) {

  if (
    !Array.isArray(response?.output)
  ) {
    return [];
  }

  return response.output
    .filter(
      (item) =>
        item?.type ===
        "function_call"
    )
    .map((item) => ({
      id: item.call_id,
      name: item.name,
      arguments: item.arguments
    }));
}


/*
|--------------------------------------------------------------------------
| MAIN AI FUNCTION
|--------------------------------------------------------------------------
*/

export async function generateAIResponse({
  message,
  conversation = [],
  languageAnalysis = null,
  contextPackage = null,
  settings = {},
  tools = [],
  model = DEFAULT_MODEL
}) {

  if (
    !message ||
    typeof message !== "string"
  ) {
    throw new Error(
      "AI message is required."
    );
  }

  const instructions =
    buildInstructions({
      languageAnalysis,
      contextPackage,
      settings
    });

  const input =
    buildInput({
      conversation,
      message
    });

  const response =
    await requestOpenAI({
      model,
      instructions,
      input,
      tools
    });

  const text =
    extractResponseText(
      response
    );

  const toolCalls =
    extractToolCalls(
      response
    );

  return {
    id:
      response.id ||
      crypto.randomUUID(),

    model,

    text,

    toolCalls,

    raw: response
  };
}


/*
|--------------------------------------------------------------------------
| SIMPLE HEALTH CHECK
|--------------------------------------------------------------------------
*/

export function isAIConfigured() {
  return Boolean(
    process.env.AI_API_KEY
  );
}


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export {
  SENN_SYSTEM_PROMPT,
  buildInstructions,
  buildInput,
  extractResponseText,
  extractToolCalls
};
