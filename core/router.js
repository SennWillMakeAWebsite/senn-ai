/**
 * SENN AI 2.0
 * Tool & Intent Router
 *
 * Tugas:
 * - membaca pesan user
 * - menentukan kebutuhan utama
 * - menentukan apakah perlu tool
 * - menentukan tool yang mungkin digunakan
 * - menyiapkan routing untuk AI Core
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
    "kapan"
  ],

  calculator: [
    "hitung",
    "berapa hasil",
    "kalkulasi",
    "calculate"
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


/**
 * Normalisasi sederhana.
 *
 * Ini BELUM menjadi Language Layer final.
 * Language Layer akan kita bangun di file terpisah.
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}


/**
 * Mencari kemungkinan tool berdasarkan pesan.
 */
function detectTools(message) {
  const text = normalizeText(message);

  const detectedTools = [];

  for (const [toolName, keywords] of Object.entries(TOOL_RULES)) {
    const matched = keywords.some((keyword) =>
      text.includes(keyword)
    );

    if (matched) {
      detectedTools.push(toolName);
    }
  }

  return detectedTools;
}


/**
 * Menentukan kategori dasar pertanyaan.
 */
function detectIntent(message) {
  const text = normalizeText(message);

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
    text.startsWith("siapa ")
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
    text.includes("gak jalan")
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


/**
 * Menentukan apakah pesan membutuhkan tool.
 */
function requiresTool(tools) {
  return tools.length > 0;
}


/**
 * Router utama.
 */
export function routeRequest({
  message,
  conversation = [],
  settings = {}
}) {
  const normalizedMessage = normalizeText(message);

  const intent = detectIntent(normalizedMessage);

  const tools = detectTools(normalizedMessage);

  return {
    originalMessage: message,

    normalizedMessage,

    intent,

    requiresTool: requiresTool(tools),

    tools,

    context: {
      conversationLength: conversation.length
    },

    settings
  };
}


/**
 * Export tambahan untuk testing.
 */
export {
  normalizeText,
  detectIntent,
  detectTools
};
