/**
 * SENN AI 2.0
 * Language Understanding Layer
 *
 * Tugas:
 * - memahami singkatan chat
 * - memahami slang
 * - menangani typo ringan
 * - mendeteksi bahasa
 * - mempertahankan pesan asli
 * - membuat versi pesan yang lebih mudah dipahami AI
 * - menangani pesan sangat pendek
 * - membantu memahami konteks bahasa informal
 *
 * Catatan:
 * Pesan user TIDAK diganti secara permanen.
 * originalMessage selalu dipertahankan.
 */

const SLANG_MAP = {
  // Indonesian chat
  "y": "ya",
  "iya": "iya",
  "iy": "iya",
  "iyh": "iya",
  "yup": "iya",
  "yap": "iya",

  "ok": "oke",
  "oke": "oke",
  "okk": "oke",
  "okey": "oke",

  "g": "tidak",
  "ga": "tidak",
  "gak": "tidak",
  "ngga": "tidak",
  "nggak": "tidak",
  "engga": "tidak",
  "enggak": "tidak",

  "gmw": "tidak mau",
  "gakmau": "tidak mau",
  "gamau": "tidak mau",
  "nggakmau": "tidak mau",

  "gmn": "bagaimana",
  "gmna": "bagaimana",
  "gimana": "bagaimana",
  "gimna": "bagaimana",
  "gimanaaa": "bagaimana",

  "knp": "kenapa",
  "knapa": "kenapa",
  "kenapaa": "kenapa",

  "udh": "sudah",
  "udah": "sudah",
  "dah": "sudah",
  "sdh": "sudah",

  "blm": "belum",
  "blom": "belum",
  "belom": "belum",

  "bsk": "besok",
  "bsok": "besok",

  "skrg": "sekarang",
  "skrng": "sekarang",
  "sekaranggg": "sekarang",

  "lg": "lagi",
  "lgi": "lagi",

  "dr": "dari",
  "dri": "dari",

  "krn": "karena",
  "karna": "karena",

  "tp": "tapi",
  "tpi": "tapi",

  "klo": "kalau",
  "kalo": "kalau",
  "kl": "kalau",

  "jd": "jadi",
  "jdi": "jadi",

  "yg": "yang",

  "dgn": "dengan",
  "dg": "dengan",

  "buat": "buat",
  "bwt": "buat",

  "utk": "untuk",
  "unt": "untuk",

  "aja": "saja",
  "aj": "saja",

  "banget": "sangat",
  "bgt": "sangat",

  "dong": "dong",
  "donk": "dong",

  "nih": "ini",
  "ni": "ini",

  "tuh": "itu",
  "tu": "itu",

  "kek": "seperti",
  "kayak": "seperti",
  "kyk": "seperti",

  "dah": "sudah",

  "trus": "terus",
  "trs": "terus",

  "sebentar": "sebentar",
  "bntar": "sebentar",

  "sama": "dengan",
  "sm": "dengan",

  "pake": "pakai",
  "pk": "pakai",

  "bikin": "membuat",
  "bikinin": "membuatkan",

  "tolong": "tolong",

  // Common internet/chat slang
  "wkwk": "tertawa",
  "wkwkwk": "tertawa",
  "wk": "tertawa",
  "haha": "tertawa",
  "hehe": "tertawa",

  "lol": "tertawa",
  "lmao": "tertawa",

  "otw": "sedang dalam perjalanan",
  "afk": "sedang tidak aktif",
  "brb": "segera kembali",

  "btw": "ngomong-ngomong",
  "fyi": "sebagai informasi",
  "imo": "menurut saya",
  "idk": "saya tidak tahu",

  "gas": "lanjut",
  "gass": "lanjut",
  "gaskeun": "lanjut",

  "mager": "malas bergerak",
  "gabut": "tidak ada kegiatan",
  "baper": "terbawa perasaan"
};


/**
 * Kata-kata yang sering diperpanjang dalam chat.
 *
 * Contoh:
 * "baguuuusss" → "bagus"
 * "gimanaa" → "gimana"
 *
 * Tidak diterapkan ke semua kata secara membabi buta.
 * Kita hanya mengurangi pengulangan karakter berlebihan.
 */
function reduceRepeatedCharacters(text) {
  return text.replace(
    /([a-zA-ZÀ-ÿ])\1{2,}/gi,
    "$1$1"
  );
}


/**
 * Membersihkan whitespace tanpa menghilangkan
 * tanda baca penting.
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Memecah pesan menjadi token.
 */
function tokenize(text) {
  return text.match(
    /[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu
  ) || [];
}


/**
 * Mengembalikan token ke bentuk string.
 */
function detokenize(tokens) {
  let result = "";

  for (const token of tokens) {
    if (/^[.,!?;:%)\]}]/.test(token)) {
      result += token;
    } else if (/^[({[]$/.test(token)) {
      result += token;
    } else {
      if (result.length > 0) {
        result += " ";
      }

      result += token;
    }
  }

  return result.trim();
}


/**
 * Mendeteksi bahasa secara sederhana.
 *
 * Ini bukan translator.
 * Ini hanya memberi sinyal kepada AI Core.
 */
function detectLanguage(text) {
  const lower = text.toLowerCase();

  const indonesianWords = [
    "yang",
    "dan",
    "atau",
    "apa",
    "kenapa",
    "gimana",
    "bagaimana",
    "saya",
    "aku",
    "lu",
    "kamu",
    "buat",
    "bikin",
    "bisa",
    "tidak",
    "nggak",
    "enggak",
    "dengan",
    "untuk",
    "dari",
    "ini",
    "itu"
  ];

  const englishWords = [
    "the",
    "and",
    "or",
    "what",
    "why",
    "how",
    "can",
    "could",
    "would",
    "make",
    "create",
    "build",
    "this",
    "that",
    "with",
    "from",
    "for"
  ];

  let idScore = 0;
  let enScore = 0;

  for (const word of indonesianWords) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      idScore++;
    }
  }

  for (const word of englishWords) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      enScore++;
    }
  }

  if (idScore > 0 && enScore > 0) {
    return "mixed";
  }

  if (idScore > enScore) {
    return "id";
  }

  if (enScore > idScore) {
    return "en";
  }

  return "unknown";
}


/**
 * Mengganti singkatan berdasarkan token.
 *
 * Hanya dilakukan ketika token memang ada
 * di dictionary.
 */
function expandSlang(text) {
  const tokens = tokenize(text);

  const expanded = tokens.map((token) => {
    const lower = token.toLowerCase();

    if (SLANG_MAP[lower]) {
      return SLANG_MAP[lower];
    }

    return token;
  });

  return detokenize(expanded);
}


/**
 * Menentukan apakah pesan sangat pendek.
 *
 * Pesan seperti:
 * "y"
 * "ok"
 * "gas"
 * "lah?"
 * "terus?"
 *
 * perlu diperlakukan berbeda karena konteks
 * percakapan menjadi sangat penting.
 */
function isShortMessage(text) {
  const tokens = tokenize(text);

  return tokens.length <= 3;
}


/**
 * Mendeteksi pesan yang kemungkinan merupakan
 * acknowledgment / respons singkat.
 */
function detectShortIntent(text) {
  const lower = text
    .toLowerCase()
    .trim();

  if (
    [
      "y",
      "ya",
      "iya",
      "iy",
      "ok",
      "oke",
      "okk",
      "sip",
      "nah",
      "gas",
      "gass"
    ].includes(lower)
  ) {
    return "acknowledgement";
  }

  if (
    [
      "lah?",
      "hah?",
      "apa?",
      "terus?",
      "trus?",
      "gimana?",
      "gmna?",
      "gmn?"
    ].includes(lower)
  ) {
    return "contextual_followup";
  }

  return null;
}


/**
 * Menentukan apakah user kemungkinan meminta
 * konfirmasi / persetujuan.
 */
function detectConfirmation(text) {
  const lower = text.toLowerCase().trim();

  return [
    "bener?",
    "benar?",
    "yakin?",
    "bisa?",
    "boleh?",
    "kan?",
    "iya kan?",
    "betul?"
  ].includes(lower);
}


/**
 * Proses utama Language Layer.
 */
export function analyzeLanguage({
  message,
  conversation = []
}) {
  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    return {
      originalMessage: message,
      normalizedMessage: "",
      language: "unknown",
      isShortMessage: true,
      shortIntent: "empty",
      confirmation: false,
      slangDetected: false,
      tokens: [],
      contextRequired: true
    };
  }

  const originalMessage = message;

  let normalized = normalizeWhitespace(
    originalMessage
  );

  normalized = reduceRepeatedCharacters(
    normalized
  );

  const beforeExpansion = normalized;

  normalized = expandSlang(normalized);

  const language = detectLanguage(
    normalized
  );

  const shortMessage =
    isShortMessage(originalMessage);

  const shortIntent =
    shortMessage
      ? detectShortIntent(originalMessage)
      : null;

  const confirmation =
    detectConfirmation(originalMessage);

  const tokens = tokenize(normalized);

  return {
    originalMessage,

    normalizedMessage: normalized,

    language,

    isShortMessage: shortMessage,

    shortIntent,

    confirmation,

    slangDetected:
      beforeExpansion.toLowerCase() !==
      normalized.toLowerCase(),

    tokens,

    contextRequired:
      shortMessage ||
      Boolean(shortIntent === "contextual_followup"),

    context: {
      conversationLength:
        conversation.length
    }
  };
}


/**
 * Expose dictionary untuk testing
 * dan pengembangan selanjutnya.
 */
export {
  SLANG_MAP,
  expandSlang,
  detectLanguage,
  detectShortIntent,
  detectConfirmation,
  isShortMessage,
  normalizeWhitespace,
  reduceRepeatedCharacters
};
