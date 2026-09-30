/**
 * SENN AI 2.0
 * Context Engine
 *
 * Tugas:
 * - menyimpan alur percakapan
 * - menentukan pesan mana yang masih relevan
 * - menangani pertanyaan pendek
 * - menyediakan context untuk AI Core
 * - membatasi ukuran context
 *
 * Catatan:
 * Ini adalah conversation context.
 * Persistent memory akan dibuat terpisah nanti.
 */

const DEFAULT_MAX_MESSAGES = 30;
const DEFAULT_MAX_CHARS = 24000;


/**
 * Membuat ID conversation.
 */
export function createConversationId() {
  return crypto.randomUUID();
}


/**
 * Membuat message object standar.
 */
export function createMessage({
  role,
  content,
  metadata = {}
}) {
  return {
    id: crypto.randomUUID(),

    role,

    content,

    timestamp: new Date().toISOString(),

    metadata
  };
}


/**
 * Validasi role.
 */
function isValidRole(role) {
  return [
    "system",
    "user",
    "assistant",
    "tool"
  ].includes(role);
}


/**
 * Membersihkan conversation dari data
 * yang formatnya tidak valid.
 */
export function sanitizeConversation(
  conversation = []
) {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .filter((message) => {

      if (!message) {
        return false;
      }

      if (!isValidRole(message.role)) {
        return false;
      }

      if (
        typeof message.content !== "string"
      ) {
        return false;
      }

      return message.content.trim().length > 0;
    })
    .map((message) => ({
      id:
        message.id ||
        crypto.randomUUID(),

      role: message.role,

      content: message.content.trim(),

      timestamp:
        message.timestamp ||
        new Date().toISOString(),

      metadata:
        message.metadata || {}
    }));
}


/**
 * Membatasi jumlah message.
 */
export function limitMessages(
  conversation,
  maxMessages = DEFAULT_MAX_MESSAGES
) {
  if (
    conversation.length <= maxMessages
  ) {
    return conversation;
  }

  return conversation.slice(
    conversation.length - maxMessages
  );
}


/**
 * Membatasi total karakter context.
 *
 * Ini penting supaya conversation panjang
 * tidak terus membesar dan menghabiskan
 * context window model.
 */
export function limitCharacters(
  conversation,
  maxCharacters = DEFAULT_MAX_CHARS
) {
  let total = 0;

  const selected = [];

  for (
    let i = conversation.length - 1;
    i >= 0;
    i--
  ) {
    const message = conversation[i];

    const length =
      message.content.length;

    if (
      total + length >
      maxCharacters
    ) {
      break;
    }

    selected.unshift(message);

    total += length;
  }

  return selected;
}


/**
 * Mengambil conversation yang sudah
 * dibersihkan dan dibatasi.
 */
export function prepareConversation(
  conversation = {},
  options = {}
) {
  const {
    maxMessages = DEFAULT_MAX_MESSAGES,
    maxCharacters = DEFAULT_MAX_CHARS
  } = options;

  let clean =
    sanitizeConversation(
      conversation
    );

  clean =
    limitMessages(
      clean,
      maxMessages
    );

  clean =
    limitCharacters(
      clean,
      maxCharacters
    );

  return clean;
}


/**
 * Mendapatkan pesan terakhir.
 */
export function getLastMessage(
  conversation
) {
  if (
    !conversation ||
    conversation.length === 0
  ) {
    return null;
  }

  return conversation[
    conversation.length - 1
  ];
}


/**
 * Mendapatkan pesan terakhir dari user.
 */
export function getLastUserMessage(
  conversation
) {
  if (
    !conversation ||
    conversation.length === 0
  ) {
    return null;
  }

  for (
    let i = conversation.length - 1;
    i >= 0;
    i--
  ) {
    if (
      conversation[i].role === "user"
    ) {
      return conversation[i];
    }
  }

  return null;
}


/**
 * Mendapatkan beberapa pesan terakhir.
 */
export function getRecentMessages(
  conversation,
  count = 10
) {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation.slice(
    -count
  );
}


/**
 * Membuat ringkasan sederhana dari
 * percakapan terakhir.
 *
 * Ini BELUM menggunakan AI.
 * AI summarization akan ditambahkan
 * ketika context sudah terlalu panjang.
 */
export function createContextSummary(
  conversation
) {
  const recent =
    getRecentMessages(
      conversation,
      8
    );

  if (recent.length === 0) {
    return "";
  }

  return recent
    .map((message) => {

      const role =
        message.role === "user"
          ? "User"
          : message.role === "assistant"
            ? "Senn"
            : message.role;

      return `${role}: ${message.content}`;
    })
    .join("\n");
}


/**
 * Menentukan apakah pesan membutuhkan
 * context sebelumnya.
 *
 * Contoh:
 *
 * "apa itu Python?"
 * → false
 *
 * "gunanya?"
 * → true
 *
 * "terus?"
 * → true
 *
 * "yang tadi"
 * → true
 */
export function requiresContext(
  languageAnalysis
) {
  if (!languageAnalysis) {
    return false;
  }

  if (
    languageAnalysis.contextRequired
  ) {
    return true;
  }

  if (
    languageAnalysis.isShortMessage
  ) {
    return true;
  }

  return false;
}


/**
 * Mencari pesan yang kemungkinan
 * menjadi referensi dari pertanyaan pendek.
 */
export function findReferenceMessages(
  conversation,
  count = 6
) {
  const recent =
    getRecentMessages(
      conversation,
      count
    );

  return recent.filter(
    (message) =>
      message.role === "user" ||
      message.role === "assistant"
  );
}


/**
 * Membuat context package untuk AI.
 *
 * Ini menjadi format yang nantinya
 * digunakan oleh AI Core.
 */
export function buildContextPackage({
  conversation = [],
  languageAnalysis = null,
  userMessage = ""
}) {
  const prepared =
    prepareConversation(
      conversation
    );

  const needsContext =
    requiresContext(
      languageAnalysis
    );

  const references =
    needsContext
      ? findReferenceMessages(
          prepared
        )
      : [];

  return {
    conversation: prepared,

    currentMessage: userMessage,

    needsContext,

    references,

    recent:
      getRecentMessages(
        prepared,
        10
      ),

    summary:
      createContextSummary(
        prepared
      )
  };
}


/**
 * Menambahkan user message ke conversation.
 */
export function appendUserMessage(
  conversation,
  content,
  metadata = {}
) {
  const clean =
    sanitizeConversation(
      conversation
    );

  clean.push(
    createMessage({
      role: "user",
      content,
      metadata
    })
  );

  return clean;
}


/**
 * Menambahkan assistant message.
 */
export function appendAssistantMessage(
  conversation,
  content,
  metadata = {}
) {
  const clean =
    sanitizeConversation(
      conversation
    );

  clean.push(
    createMessage({
      role: "assistant",
      content,
      metadata
    })
  );

  return clean;
}


/**
 * Menghapus conversation.
 */
export function clearConversation() {
  return [];
}


/**
 * Statistik conversation.
 */
export function getConversationStats(
  conversation = []
) {
  const clean =
    sanitizeConversation(
      conversation
    );

  let userMessages = 0;
  let assistantMessages = 0;
  let toolMessages = 0;

  for (const message of clean) {

    if (message.role === "user") {
      userMessages++;
    }

    if (
      message.role === "assistant"
    ) {
      assistantMessages++;
    }

    if (message.role === "tool") {
      toolMessages++;
    }
  }

  return {
    total: clean.length,

    userMessages,

    assistantMessages,

    toolMessages,

    characters:
      clean.reduce(
        (total, message) =>
          total +
          message.content.length,
        0
      )
  };
}
