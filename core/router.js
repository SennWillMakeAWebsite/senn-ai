/**
 * SENN AI 2.0
 * Request Router
 *
 * Tugas:
 * - memahami intent
 * - mendeteksi kebutuhan tool
 * - menentukan execution plan
 * - menjadi penghubung antara user dan tool engine
 */

const TOOL_RULES = {
  web_search: [
    "berita",
    "terbaru",
    "terkini",
    "hari ini",
    "sekarang",
    "harga",
    "jadwal",
    "update",
    "cari",
    "search",
    "google",
    "internet",
    "siapa",
    "kapan",
    "dimana",
    "di mana",
    "lokasi"
  ],

  calculator: [
    "hitung",
    "berapa hasil",
    "kalkulasi",
    "calculate",
    "berapa"
  ],

  weather: [
    "cuaca",
    "hujan",
    "suhu",
    "weather"
  ],

  time: [
    "jam berapa",
    "waktu sekarang",
    "sekarang jam"
  ],

  files: [
    "file ini",
    "pdf ini",
    "dokumen ini",
    "baca file",
    "analisis file",
    "jelaskan file"
  ]
};


/*
|--------------------------------------------------------------------------
| TEXT NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}


/*
|--------------------------------------------------------------------------
| INTENT DETECTION
|--------------------------------------------------------------------------
*/

function detectIntent(message) {

  const text =
    normalizeText(message);

  if (!text) {
    return "empty";
  }


  if (
    text.includes("?") ||
    text.startsWith("apa ") ||
    text.startsWith("kenapa ") ||
    text.startsWith("bagaimana ") ||
    text.startsWith("gimana ") ||
    text.startsWith("kapan ") ||
    text.startsWith("siapa ") ||
    text.startsWith("dimana ") ||
    text.startsWith("di mana ")
  ) {

    return "question";

  }


  if (
    text.startsWith("buat ") ||
    text.startsWith("bikin ") ||
    text.startsWith("buatkan ") ||
    text.startsWith("bikinin ")
  ) {

    return "creation";

  }


  if (
    text.includes("error") ||
    text.includes("bug") ||
    text.includes("rusak") ||
    text.includes("tidak bekerja") ||
    text.includes("gak jalan") ||
    text.includes("ga jalan")
  ) {

    return "debugging";

  }


  if (
    text.includes("jelaskan") ||
    text.includes("jelasin") ||
    text.includes("explain")
  ) {

    return "explanation";

  }


  return "conversation";
}


/*
|--------------------------------------------------------------------------
| TOOL DETECTION
|--------------------------------------------------------------------------
*/

function detectTools(message) {

  const text =
    normalizeText(message);

  const detectedTools = [];


  for (
    const [toolName, keywords]
    of Object.entries(TOOL_RULES)
  ) {

    const matched =
      keywords.some(
        (keyword) =>
          text.includes(keyword)
      );


    if (matched) {

      detectedTools.push(
        toolName
      );

    }

  }


  /*
   * Remove duplicate tools.
   */

  return [
    ...new Set(
      detectedTools
    )
  ];
}


/*
|--------------------------------------------------------------------------
| TOOL PRIORITY
|--------------------------------------------------------------------------
*/

function prioritizeTools(
  tools
) {

  const priority = {

    web_search: 1,

    files: 2,

    calculator: 3,

    weather: 4,

    time: 5

  };


  return [
    ...tools
  ].sort(
    (a, b) =>
      (priority[a] || 99) -
      (priority[b] || 99)
  );
}


/*
|--------------------------------------------------------------------------
| EXECUTION PLAN
|--------------------------------------------------------------------------
*/

function buildExecutionPlan({
  intent,
  tools
}) {

  const prioritizedTools =
    prioritizeTools(tools);


  /*
   * Tidak membutuhkan tool.
   */

  if (
    prioritizedTools.length === 0
  ) {

    return {

      mode:
        "ai",

      tools: [],

      requiresExternalData:
        false

    };

  }


  /*
   * Membutuhkan external tool.
   */

  return {

    mode:
      "tool",

    tools:
      prioritizedTools,

    requiresExternalData:
      true

  };

}


/*
|--------------------------------------------------------------------------
| MAIN ROUTER
|--------------------------------------------------------------------------
*/

export function routeRequest({

  message,

  conversation = [],

  settings = {}

}) {

  const normalizedMessage =
    normalizeText(message);


  const intent =
    detectIntent(
      normalizedMessage
    );


  const tools =
    detectTools(
      normalizedMessage
    );


  const execution =
    buildExecutionPlan({
      intent,
      tools
    });


  return {

    originalMessage:
      message,

    normalizedMessage,

    intent,

    requiresTool:
      execution.tools.length > 0,

    tools:
      execution.tools,

    execution,

    context: {

      conversationLength:
        conversation.length

    },

    settings

  };

}


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export {

  TOOL_RULES,

  normalizeText,

  detectIntent,

  detectTools,

  prioritizeTools,

  buildExecutionPlan

};
