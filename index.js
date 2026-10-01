/*
|--------------------------------------------------------------------------
| SENN AI V2
| index.js
|--------------------------------------------------------------------------
*/

"use strict";

/* ==========================================================================
   CONFIG
========================================================================== */

const API = {
  chat: "/api/chat",
  status: "/api/status"
};

const STORAGE = {
  history: "senn_ai_history",
  theme: "senn_ai_theme"
};

const state = {
  conversation: [],
  history: [],
  sending: false,
  currentChatId: null,
  serverOnline: false
};


/* ==========================================================================
   ELEMENTS
========================================================================== */

let chat;
let chatInner;
let welcome;
let input;
let sendButton;
let composer;
let newChat;
let chatHistory;
let statusText;
let statusDot;
let sidebar;
let mobileMenu;


/* ==========================================================================
   INIT
========================================================================== */

document.addEventListener("DOMContentLoaded", init);

function init() {

  cacheElements();

  loadHistory();

  bindEvents();

  checkServer();

  autoResize();

  updateSendButton();

  if (input) {
    input.focus();
  }

}


/* ==========================================================================
   CACHE ELEMENTS
========================================================================== */

function cacheElements() {

  chat = document.getElementById("chat");

  chatInner =
    document.getElementById("chatInner");

  welcome =
    document.getElementById("welcome");

  input =
    document.getElementById("messageInput");

  sendButton =
    document.getElementById("sendButton");

  composer =
    document.getElementById("composer");

  newChat =
    document.getElementById("newChat");

  chatHistory =
    document.getElementById("chatHistory");

  statusText =
    document.getElementById("statusText");

  statusDot =
    document.getElementById("statusDot");

  sidebar =
    document.getElementById("sidebar");

  mobileMenu =
    document.getElementById("mobileMenu");

}


/* ==========================================================================
   EVENTS
========================================================================== */

function bindEvents() {

  /* SEND */

  composer?.addEventListener("submit", event => {

    event.preventDefault();

    sendMessage();

  });


  /* ENTER */

  input?.addEventListener("keydown", event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  });


  /* INPUT */

  input?.addEventListener("input", () => {

    autoResize();

    updateSendButton();

  });


  /* NEW CHAT */

  newChat?.addEventListener(
    "click",
    createNewChat
  );


  /* MOBILE MENU */

  mobileMenu?.addEventListener("click", event => {

    event.stopPropagation();

    toggleSidebar();

  });


  /* SUGGESTIONS */

  document
    .querySelectorAll(".suggestion")
    .forEach(button => {

      button.addEventListener("click", () => {

        const message =
          button.dataset.message;

        if (!message || !input) {
          return;
        }

        input.value = message;

        autoResize();

        updateSendButton();

        input.focus();

        sendMessage();

      });

    });


  /* CLOSE SIDEBAR */

  chat?.addEventListener("click", () => {

    if (window.innerWidth <= 760) {

      closeSidebar();

    }

  });


  /* ESC */

  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

      closeSidebar();

    }

  });


  /* CLICK OUTSIDE SIDEBAR */

  document.addEventListener("click", event => {

    if (window.innerWidth > 760) {
      return;
    }

    if (!sidebar?.classList.contains("open")) {
      return;
    }

    if (
      sidebar.contains(event.target) ||
      mobileMenu?.contains(event.target)
    ) {
      return;
    }

    closeSidebar();

  });

}


/* ==========================================================================
   SIDEBAR
========================================================================== */

function toggleSidebar() {

  sidebar?.classList.toggle("open");

}

function closeSidebar() {

  sidebar?.classList.remove("open");

}


/* ==========================================================================
   SEND MESSAGE
========================================================================== */

async function sendMessage() {

  if (state.sending) {
    return;
  }

  if (!input) {
    return;
  }

  const message =
    input.value.trim();

  if (!message) {

    input.focus();

    return;

  }


  if (!state.currentChatId) {

    state.currentChatId =
      createId();

  }


  state.sending = true;

  setSendingState(true);

  hideWelcome();


  /* USER MESSAGE */

  addMessage(
    "user",
    message
  );


  /* CONVERSATION */

  state.conversation.push({

    role: "user",

    content: message

  });


  /* CLEAR INPUT */

  input.value = "";

  autoResize();

  updateSendButton();


  /* TYPING */

  const typing =
    addTyping();


  try {

    const response =
      await fetch(
        API.chat,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              message,

              conversation:
                state.conversation

            })

        }
      );


    if (!response.ok) {

      let errorMessage =
        `Server error (${response.status})`;

      try {

        const errorData =
          await response.json();

        if (
          errorData?.error
        ) {

          errorMessage =
            errorData.error;

        }

      } catch {

        /* response bukan JSON */

      }

      throw new Error(
        errorMessage
      );

    }


    const data =
      await response.json();


    removeTyping(typing);


    const answer =
      extractAnswer(data);


    addMessage(
      "assistant",
      answer,
      data
    );


    state.conversation.push({

      role: "assistant",

      content: answer

    });


    saveCurrentChat(message);


  } catch (error) {

    console.error(
      "[SENN ERROR]",
      error
    );


    removeTyping(typing);


    addMessage(
      "assistant",
      `Maaf, Senn mengalami kendala.

${error?.message || "Server tidak dapat dihubungi."}`
    );


  } finally {

    state.sending = false;

    setSendingState(false);

    updateSendButton();

    input.focus();

  }

}


/* ==========================================================================
   EXTRACT ANSWER
========================================================================== */

function extractAnswer(data) {

  if (
    typeof data?.answer === "string"
  ) {

    return data.answer;

  }

  if (
    typeof data?.text === "string"
  ) {

    return data.text;

  }

  if (
    typeof data?.message === "string"
  ) {

    return data.message;

  }

  if (
    typeof data?.result?.text === "string"
  ) {

    return data.result.text;

  }

  if (
    typeof data?.data?.text === "string"
  ) {

    return data.data.text;

  }

  return "Senn tidak menerima jawaban dari server.";

}


/* ==========================================================================
   ADD MESSAGE
========================================================================== */

function addMessage(
  role,
  content,
  metadata = null
) {

  if (!chatInner) {
    return null;
  }


  const message =
    document.createElement("div");

  message.className =
    `message ${role}`;


  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    role === "user"
      ? "U"
      : "S";


  const contentWrapper =
    document.createElement("div");

  contentWrapper.className =
    "message-content";


  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.innerHTML =
    formatMessage(content);


  contentWrapper.appendChild(
    bubble
  );


  message.appendChild(
    avatar
  );

  message.appendChild(
    contentWrapper
  );


  chatInner.appendChild(
    message
  );


  if (
    role === "assistant" &&
    metadata
  ) {

    const sources =
      getSources(metadata);

    if (sources.length) {

      appendSources(
        contentWrapper,
        sources
      );

    }

  }


  scrollToBottom();

  return message;

}


/* ==========================================================================
   FORMAT MESSAGE
========================================================================== */

function formatMessage(text) {

  if (
    typeof text !== "string"
  ) {

    return "";

  }


  let result =
    escapeHTML(text);


  /*
  CODE BLOCK
  */

  result =
    result.replace(
      /```(?:[\w-]+)?\n?([\s\S]*?)```/g,
      (_, code) => {

        return `<pre><code>${code}</code></pre>`;

      }
    );


  /*
  INLINE CODE
  */

  result =
    result.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );


  /*
  BOLD
  */

  result =
    result.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
  ITALIC
  */

  result =
    result.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      "<em>$1</em>"
    );


  /*
  HEADINGS
  */

  result =
    result.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

  result =
    result.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

  result =
    result.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );


  /*
  LINKS
  */

  result =
    result.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );


  /*
  NEWLINES
  */

  result =
    result.replace(
      /\n/g,
      "<br>"
    );


  /*
  FIX CODE BLOCKS
  */

  result =
    result.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      (_, code) => {

        return (
          `<pre><code>${code
            .replace(/<br>/g, "\n")
          }</code></pre>`
        );

      }
    );


  return result;

}


/* ==========================================================================
   ESCAPE HTML
========================================================================== */

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text;

  return div.innerHTML;

}


/* ==========================================================================
   TYPING
========================================================================== */

function addTyping() {

  if (!chatInner) {
    return null;
  }


  const message =
    document.createElement("div");

  message.className =
    "message assistant";


  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    "S";


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";


  const typing =
    document.createElement("div");

  typing.className =
    "typing";


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const dot =
      document.createElement("span");

    typing.appendChild(
      dot
    );

  }


  bubble.appendChild(
    typing
  );

  content.appendChild(
    bubble
  );

  message.appendChild(
    avatar
  );

  message.appendChild(
    content
  );

  chatInner.appendChild(
    message
  );


  scrollToBottom();


  return message;

}


/* ==========================================================================
   REMOVE TYPING
========================================================================== */

function removeTyping(element) {

  if (
    element &&
    element.parentNode
  ) {

    element.parentNode.removeChild(
      element
    );

  }

}


/* ==========================================================================
   SOURCES
========================================================================== */

function getSources(metadata) {

  if (
    Array.isArray(
      metadata?.sources
    )
  ) {

    return metadata.sources;

  }

  if (
    Array.isArray(
      metadata?.result?.sources
    )
  ) {

    return metadata.result.sources;

  }

  if (
    Array.isArray(
      metadata?.data?.sources
    )
  ) {

    return metadata.data.sources;

  }

  return [];

}


/* ==========================================================================
   SOURCE LINKS
========================================================================== */

function appendSources(
  parent,
  sources
) {

  const validSources =
    sources
      .filter(
        source =>
          source &&
          source.url
      )
      .slice(0, 6);


  if (!validSources.length) {
    return;
  }


  const container =
    document.createElement("div");

  container.className =
    "sources";


  const title =
    document.createElement("div");

  title.className =
    "sources-title";

  title.textContent =
    "Sources";


  container.appendChild(
    title
  );


  validSources.forEach(
    source => {

      const link =
        document.createElement("a");

      link.className =
        "source-link";

      link.href =
        source.url;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        source.title ||
        source.url;


      container.appendChild(
        link
      );

    }
  );


  parent.appendChild(
    container
  );

}


/* ==========================================================================
   WELCOME
========================================================================== */

function hideWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "none";

}


function showWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "flex";

}


/* ==========================================================================
   NEW CHAT
========================================================================== */

function createNewChat() {

  state.conversation = [];

  state.currentChatId =
    createId();


  if (chatInner) {

    chatInner
      .querySelectorAll(".message")
      .forEach(
        element =>
          element.remove()
      );

  }


  showWelcome();


  if (input) {

    input.value = "";

    autoResize();

    updateSendButton();

    input.focus();

  }


  closeSidebar();

}


/* ==========================================================================
   SAVE HISTORY
========================================================================== */

function saveCurrentChat(
  firstMessage
) {

  const title =
    firstMessage
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);


  const chatData = {

    id:
      state.currentChatId ||
      createId(),

    title:
      title ||
      "New conversation",

    conversation:
      state.conversation,

    updatedAt:
      Date.now()

  };


  state.currentChatId =
    chatData.id;


  const existingIndex =
    state.history.findIndex(
      item =>
        item.id ===
        chatData.id
    );


  if (existingIndex >= 0) {

    state.history[
      existingIndex
    ] = chatData;

  } else {

    state.history.unshift(
      chatData
    );

  }


  state.history =
    state.history
      .sort(
        (a, b) =>
          (b.updatedAt || 0) -
          (a.updatedAt || 0)
      )
      .slice(0, 30);


  persistHistory();

  renderHistory();

}


/* ==========================================================================
   PERSIST HISTORY
========================================================================== */

function persistHistory() {

  try {

    localStorage.setItem(
      STORAGE.history,
      JSON.stringify(
        state.history
      )
    );

  } catch (error) {

    console.warn(
      "[SENN] History gagal disimpan.",
      error
    );

  }

}


/* ==========================================================================
   LOAD HISTORY
========================================================================== */

function loadHistory() {

  try {

    const stored =
      localStorage.getItem(
        STORAGE.history
      );


    if (!stored) {

      renderHistory();

      return;

    }


    const parsed =
      JSON.parse(stored);


    if (
      Array.isArray(parsed)
    ) {

      state.history =
        parsed;

    }

  } catch (error) {

    console.warn(
      "[SENN] History gagal dimuat.",
      error
    );

    state.history = [];

  }


  renderHistory();

}


/* ==========================================================================
   RENDER HISTORY
========================================================================== */

function renderHistory() {

  if (!chatHistory) {
    return;
  }


  chatHistory.innerHTML =
    "";


  if (!state.history.length) {

    const empty =
      document.createElement("div");

    empty.className =
      "history-item";

    empty.textContent =
      "Belum ada percakapan";

    empty.style.opacity =
      "0.45";

    chatHistory.appendChild(
      empty
    );

    return;

  }


  state.history.forEach(
    chatData => {

      const item =
        document.createElement("button");

      item.type =
        "button";

      item.className =
        "history-item";

      item.textContent =
        chatData.title ||
        "Conversation";

      item.title =
        chatData.title ||
        "Conversation";


      item.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          loadChat(chatData);

        }
      );


      chatHistory.appendChild(
        item
      );

    }
  );

}


/* ==========================================================================
   LOAD CHAT
========================================================================== */

function loadChat(chatData) {

  if (
    !chatData ||
    !Array.isArray(
      chatData.conversation
    )
  ) {

    return;

  }


  state.currentChatId =
    chatData.id;


  state.conversation =
    [...chatData.conversation];


  if (chatInner) {

    chatInner
      .querySelectorAll(".message")
      .forEach(
        element =>
          element.remove()
      );

  }


  hideWelcome();


  state.conversation.forEach(
    message => {

      if (
        message.role !== "user" &&
        message.role !== "assistant"
      ) {

        return;

      }


      addMessage(
        message.role,
        message.content
      );

    }
  );


  closeSidebar();

  scrollToBottom();

}


/* ==========================================================================
   SERVER STATUS
========================================================================== */

async function checkServer() {

  setStatus(
    "Connecting...",
    false
  );


  try {

    const response =
      await fetch(
        API.status,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Server offline"
      );

    }


    const data =
      await response.json();


    state.serverOnline =
      data?.success !== false;


    setStatus(
      state.serverOnline
        ? "Online"
        : "Offline",
      state.serverOnline
    );


  } catch (error) {

    state.serverOnline =
      false;


    setStatus(
      "Offline",
      false
    );


    console.warn(
      "[SENN] Server status:",
      error
    );

  }

}


/* ==========================================================================
   STATUS UI
========================================================================== */

function setStatus(
  text,
  online
) {

  if (statusText) {

    statusText.textContent =--------------------------------
*/

function formatMessage(
  text
) {

  if (
    typeof text !==
    "string"
  ) {

    return "";

  }


  let result =
    escapeHTML(
      text
    );


  /*
  | CODE BLOCK
  */

  result =
    result.replace(
      /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const label =
          language
            ? `<span class="code-language">${language}</span>`
            : "";

        return `
          <div class="code-wrapper">
            ${label}
            <pre><code>${code}</code></pre>
          </div>
        `;

      }
    );


  /*
  | INLINE CODE
  */

  result =
    result.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );


  /*
  | BOLD
  */

  result =
    result.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
  | ITALIC
  */

  result =
    result.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      "<em>$1</em>"
    );


  /*
  | HEADINGS
  */

  result =
    result.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

  result =
    result.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

  result =
    result.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );


  /*
  | CHECKBOX
  */

  result =
    result.replace(
      /^- \[ \] (.+)$/gm,
      "☐ $1"
    );

  result =
    result.replace(
      /^- \[x\] (.+)$/gim,
      "☑ $1"
    );


  /*
  | BULLETS
  */

  result =
    result.replace(
      /^[•*-] (.+)$/gm,
      "• $1"
    );


  /*
  | ORDERED LIST
  */

  result =
    result.replace(
      /^(\d+)\. (.+)$/gm,
      "$1. $2"
    );


  /*
  | LINKS
  */

  result =
    result.replace(
      /(https?:\/\/[^\s<]+)/g,
      url => {

        const cleanUrl =
          url.replace(
            /[),.!?]+$/,
            ""
          );

        return `
          <a
            href="${cleanUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >${cleanUrl}</a>
        `;

      }
    );


  /*
  | NEWLINES
  */

  result =
    result.replace(
      /\n/g,
      "<br>"
    );


  /*
  | RESTORE CODE BLOCK
  */

  result =
    result.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      (_, code) => {

        return (
          `<pre><code>${code
            .replace(
              /<br>/g,
              "\n"
            )}</code></pre>`
        );

      }
    );


  return result;

}


/*
|--------------------------------------------------------------------------
| ESCAPE HTML
|--------------------------------------------------------------------------
*/

function escapeHTML(
  text
) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text;

  return div.innerHTML;

}


/*
|--------------------------------------------------------------------------
| TYPING
|--------------------------------------------------------------------------
*/

function addTyping() {

  if (!chatInner) {
    return null;
  }


  const message =
    document.createElement(
      "div"
    );

  message.className =
    "message assistant";


  const avatar =
    document.createElement(
      "div"
    );

  avatar.className =
    "avatar";

  avatar.textContent =
    "S";


  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";


  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "bubble";


  const typing =
    document.createElement(
      "div"
    );

  typing.className =
    "typing";


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const dot =
      document.createElement(
        "span"
      );

    typing.appendChild(
      dot
    );

  }


  bubble.appendChild(
    typing
  );

  content.appendChild(
    bubble
  );

  message.appendChild(
    avatar
  );

  message.appendChild(
    content
  );

  chatInner.appendChild(
    message
  );


  scrollToBottom();


  return message;

}


/*
|--------------------------------------------------------------------------
| REMOVE TYPING
|--------------------------------------------------------------------------
*/

function removeTyping(
  element
) {

  if (
    element?.parentNode
  ) {

    element.parentNode.removeChild(
      element
    );

  }

}


/*
|--------------------------------------------------------------------------
| SOURCES
|--------------------------------------------------------------------------
*/

function getSources(
  metadata
) {

  const lists = [

    metadata?.sources,

    metadata?.result?.sources,

    metadata?.data?.sources

  ];


  for (
    const list
    of lists
  ) {

    if (
      Array.isArray(list)
    ) {

      return list;

    }

  }


  return [];

}


/*
|--------------------------------------------------------------------------
| SOURCES UI
|--------------------------------------------------------------------------
*/

function appendSources(
  parent,
  sources
) {

  const validSources =
    sources
      .filter(
        source =>
          source &&
          typeof source.url ===
            "string"
      )
      .slice(
        0,
        6
      );


  if (
    !validSources.length
  ) {

    return;

  }


  const container =
    document.createElement(
      "div"
    );

  container.className =
    "sources";


  const title =
    document.createElement(
      "div"
    );

  title.className =
    "sources-title";

  title.textContent =
    "Sources";


  container.appendChild(
    title
  );


  validSources.forEach(
    source => {

      const link =
        document.createElement(
          "a"
        );

      link.className =
        "source-link";

      link.href =
        source.url;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        source.title ||
        source.url;


      container.appendChild(
        link
      );

    }
  );


  parent.appendChild(
    container
  );

}


/*
|--------------------------------------------------------------------------
| WELCOME
|--------------------------------------------------------------------------
*/

function hideWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "none";

}


function showWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "flex";

}


/*
|--------------------------------------------------------------------------
| NEW CHAT
|--------------------------------------------------------------------------
*/

function createNewChat() {

  state.conversation =
    [];

  state.currentChatId =
    createId();


  /*
  | HAPUS MESSAGE
  */

  if (chatInner) {

    chatInner
      .querySelectorAll(
        ".message"
      )
      .forEach(
        message => {

          message.remove();

        }
      );

  }


  /*
  | WELCOME
  */

  showWelcome();


  /*
  | INPUT
  */

  if (input) {

    input.value =
      "";

    autoResize();

    input.focus();

  }


  /*
  | CLOSE MOBILE SIDEBAR
  */

  sidebar?.classList.remove(
    "open"
  );

}


/*
|--------------------------------------------------------------------------
| SAVE CURRENT CHAT
|--------------------------------------------------------------------------
*/

function saveCurrentChat(
  firstMessage
) {

  if (
    !state.currentChatId
  ) {

    state.currentChatId =
      createId();

  }


  const title =
    String(
      firstMessage || ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .slice(
        0,
        50
      ) ||
    "New conversation";


  const chatData = {

    id:
      state.currentChatId,

    title,

    conversation:
      [...state.conversation],

    updatedAt:
      Date.now()

  };


  const existingIndex =
    state.history.findIndex(
      item =>
        item.id ===
        state.currentChatId
    );


  if (
    existingIndex >= 0
  ) {

    state.history[
      existingIndex
    ] =
      chatData;

  } else {

    state.history.unshift(
      chatData
    );

  }


  /*
  | LIMIT
  */

  state.history =
    state.history.slice(
      0,
      MAX_HISTORY
    );


  saveHistory();

  renderHistory();

}


/*
|--------------------------------------------------------------------------
| LOCAL STORAGE
|--------------------------------------------------------------------------
*/

function saveHistory() {

  try {

    localStorage.setItem(
      STORAGE.history,
      JSON.stringify(
        state.history
      )
    );

  } catch (error) {

    console.warn(
      "[SENN] History gagal disimpan.",
      error
    );

  }

}


/*
|--------------------------------------------------------------------------
| LOAD HISTORY
|--------------------------------------------------------------------------
*/

function loadHistory() {

  try {

    const raw =
      localStorage.getItem(
        STORAGE.history
      );


    if (!raw) {

      renderHistory();

      return;

    }


    const parsed =
      JSON.parse(
        raw
      );


    if (
      Array.isArray(parsed)
    ) {

      state.history =
        parsed
          .filter(
            item =>
              item &&
              typeof item.id ===
                "string" &&
              Array.isArray(
                item.conversation
              )
          )
          .slice(
            0,
            MAX_HISTORY
          );

    }

  } catch (error) {

    console.warn(
      "[SENN] History tidak dapat dimuat.",
      error
    );

    state.history =
      [];

  }


  renderHistory();

}


/*
|--------------------------------------------------------------------------
| RENDER HISTORY
|--------------------------------------------------------------------------
*/

function renderHistory() {

  if (!chatHistory) {
    return;
  }


  chatHistory.innerHTML =
    "";


  if (
    !state.history.length
  ) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "history-item";

       return data.result.text;

  }


  if (
    typeof data?.data?.text === "string"
  ) {

    return data.data.text;

  }


  return (
    "Senn tidak menerima jawaban dari server."
  );

}


/*
|--------------------------------------------------------------------------
| ADD MESSAGE
|--------------------------------------------------------------------------
*/

function addMessage(
  role,
  content,
  metadata = null
) {

  if (!chatInner) {
    return null;
  }


  const message =
    document.createElement("div");

  message.className =
    `message ${role}`;


  /*
  |--------------------------------------------------------------------------
  | AVATAR
  |--------------------------------------------------------------------------
  */

  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    role === "user"
      ? "U"
      : "S";


  /*
  |--------------------------------------------------------------------------
  | CONTENT WRAPPER
  |--------------------------------------------------------------------------
  */

  const contentWrapper =
    document.createElement("div");

  contentWrapper.className =
    "message-content";


  /*
  |--------------------------------------------------------------------------
  | BUBBLE
  |--------------------------------------------------------------------------
  */

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.innerHTML =
    formatMessage(content);


  /*
  |--------------------------------------------------------------------------
  | APPEND
  |--------------------------------------------------------------------------
  */

  contentWrapper.appendChild(
    bubble
  );

  message.appendChild(
    avatar
  );

  message.appendChild(
    contentWrapper
  );

  chatInner.appendChild(
    message
  );


  /*
  |--------------------------------------------------------------------------
  | SOURCES
  |--------------------------------------------------------------------------
  */

  if (
    role === "assistant" &&
    metadata
  ) {

    const sources =
      getSources(metadata);


    if (
      sources.length > 0
    ) {

      appendSources(
        contentWrapper,
        sources
      );

    }

  }


  scrollToBottom();

  return message;

}


/*
|--------------------------------------------------------------------------
| FORMAT MESSAGE
|--------------------------------------------------------------------------
|
| Aman dari HTML injection karena text
| di-escape terlebih dahulu.
|--------------------------------------------------------------------------
*/

function formatMessage(text) {

  if (
    typeof text !== "string"
  ) {

    return "";

  }


  let result =
    escapeHTML(text);


  /*
  |--------------------------------------------------------------------------
  | CODE BLOCK
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g,
      "<pre><code>$1</code></pre>"
    );


  /*
  |--------------------------------------------------------------------------
  | INLINE CODE
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );


  /*
  |--------------------------------------------------------------------------
  | BOLD
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
  |--------------------------------------------------------------------------
  | ITALIC
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      "<em>$1</em>"
    );


  /*
  |--------------------------------------------------------------------------
  | HEADINGS
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

  result =
    result.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

  result =
    result.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );


  /*
  |--------------------------------------------------------------------------
  | BULLET
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /^[•\-] (.+)$/gm,
      "• $1"
    );


  /*
  |--------------------------------------------------------------------------
  | LINKS
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );


  /*
  |--------------------------------------------------------------------------
  | NEW LINE
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /\n/g,
      "<br>"
    );


  /*
  |--------------------------------------------------------------------------
  | CLEAN CODE BLOCK BR
  |--------------------------------------------------------------------------
  */

  result =
    result.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      (_, code) => {

        return `<pre><code>${code.replace(
          /<br>/g,
          "\n"
        )}</code></pre>`;

      }
    );


  return result;

}


/*
|--------------------------------------------------------------------------
| ESCAPE HTML
|--------------------------------------------------------------------------
*/

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text;

  return div.innerHTML;

}


/*
|--------------------------------------------------------------------------
| TYPING INDICATOR
|--------------------------------------------------------------------------
*/

function addTyping() {

  if (!chatInner) {
    return null;
  }


  const message =
    document.createElement("div");

  message.className =
    "message assistant";


  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    "S";


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";


  const typing =
    document.createElement("div");

  typing.className =
    "typing";


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const dot =
      document.createElement("span");

    typing.appendChild(dot);

  }


  bubble.appendChild(
    typing
  );

  content.appendChild(
    bubble
  );

  message.appendChild(
    avatar
  );

  message.appendChild(
    content
  );

  chatInner.appendChild(
    message
  );


  scrollToBottom();


  return message;

}


/*
|--------------------------------------------------------------------------
| REMOVE TYPING
|--------------------------------------------------------------------------
*/

function removeTyping(
  element
) {

  if (
    element &&
    element.parentNode
  ) {

    element.parentNode.removeChild(
      element
    );

  }

}


/*
|--------------------------------------------------------------------------
| SOURCES
|--------------------------------------------------------------------------
*/

function getSources(metadata) {

  if (
    Array.isArray(
      metadata?.sources
    )
  ) {

    return metadata.sources;

  }


  if (
    Array.isArray(
      metadata?.result?.sources
    )
  ) {

    return metadata.result.sources;

  }


  if (
    Array.isArray(
      metadata?.data?.sources
    )
  ) {

    return metadata.data.sources;

  }


  return [];

}


/*
|--------------------------------------------------------------------------
| APPEND SOURCES
|--------------------------------------------------------------------------
*/

function appendSources(
  parent,
  sources
) {

  const container =
    document.createElement("div");

  container.className =
    "sources";


  const title =
    document.createElement("div");

  title.className =
    "sources-title";

  title.textContent =
    "Sources";


  container.appendChild(
    title
  );


  sources
    .filter(
      source =>
        source &&
        source.url
    )
    .slice(0, 6)
    .forEach(
      source => {

        const link =
          document.createElement("a");

        link.className =
          "source-link";

        link.href =
          source.url;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.textContent =
          source.title ||
          source.url;


        container.appendChild(
          link
        );

      }
    );


  parent.appendChild(
    container
  );

}


/*
|--------------------------------------------------------------------------
| HIDE WELCOME
|--------------------------------------------------------------------------
*/

function hideWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "none";

}


/*
|--------------------------------------------------------------------------
| SHOW WELCOME
|--------------------------------------------------------------------------
*/

function showWelcome() {

  if (!welcome) {
    return;
  }

  welcome.style.display =
    "flex";

}


/*
|--------------------------------------------------------------------------
| NEW CHAT
|--------------------------------------------------------------------------
*/

function createNewChat() {

  state.conversation = [];

  state.currentChatId =
    createId();


  /*
  |--------------------------------------------------------------------------
  | REMOVE MESSAGES
  |-------------------------------------------------------------------------
