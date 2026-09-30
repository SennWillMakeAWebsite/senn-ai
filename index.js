/*
|--------------------------------------------------------------------------
| SENN AI V2
| index.js
|--------------------------------------------------------------------------
*/

"use strict";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const API = {
  chat: "/api/chat",
  status: "/api/status"
};

const STORAGE = {
  history: "senn_ai_history",
  theme: "senn_ai_theme"
};


/*
|--------------------------------------------------------------------------
| STATE
|--------------------------------------------------------------------------
*/

const state = {
  conversation: [],
  history: [],
  sending: false,
  currentChatId: null,
  serverOnline: false
};


/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const chat =
  document.getElementById("chat");

const chatInner =
  document.getElementById("chatInner");

const welcome =
  document.getElementById("welcome");

const input =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const composer =
  document.getElementById("composer");

const newChat =
  document.getElementById("newChat");

const chatHistory =
  document.getElementById("chatHistory");

const statusText =
  document.getElementById("statusText");

const statusDot =
  document.getElementById("statusDot");

const sidebar =
  document.getElementById("sidebar");

const mobileMenu =
  document.getElementById("mobileMenu");


/*
|--------------------------------------------------------------------------
| INITIALIZATION
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "DOMContentLoaded",
  init
);


function init() {

  loadHistory();

  bindEvents();

  checkServer();

  autoResize();

  input?.focus();

}


/*
|--------------------------------------------------------------------------
| EVENTS
|--------------------------------------------------------------------------
*/

function bindEvents() {

  /*
  |--------------------------------------------------------------------------
  | SEND FORM
  |--------------------------------------------------------------------------
  */

  composer?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      sendMessage();

    }
  );


  /*
  |--------------------------------------------------------------------------
  | ENTER
  |--------------------------------------------------------------------------
  */

  input?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }

    }
  );


  /*
  |--------------------------------------------------------------------------
  | INPUT
  |--------------------------------------------------------------------------
  */

  input?.addEventListener(
    "input",
    autoResize
  );


  /*
  |--------------------------------------------------------------------------
  | NEW CHAT
  |--------------------------------------------------------------------------
  */

  newChat?.addEventListener(
    "click",
    createNewChat
  );


  /*
  |--------------------------------------------------------------------------
  | MOBILE MENU
  |--------------------------------------------------------------------------
  */

  mobileMenu?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      sidebar?.classList.toggle(
        "open"
      );

    }
  );


  /*
  |--------------------------------------------------------------------------
  | SUGGESTIONS
  |--------------------------------------------------------------------------
  */

  document
    .querySelectorAll(".suggestion")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const message =
            button.dataset.message;

          if (!message) return;

          input.value = message;

          autoResize();

          sendMessage();

        }
      );

    });


  /*
  |--------------------------------------------------------------------------
  | CLOSE MOBILE SIDEBAR
  |--------------------------------------------------------------------------
  */

  chat?.addEventListener(
    "click",
    () => {

      if (
        window.innerWidth <= 760
      ) {

        sidebar?.classList.remove(
          "open"
        );

      }

    }
  );


  /*
  |--------------------------------------------------------------------------
  | ESCAPE
  |--------------------------------------------------------------------------
  */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        sidebar?.classList.remove(
          "open"
        );

      }

    }
  );

}


/*
|--------------------------------------------------------------------------
| SEND MESSAGE
|--------------------------------------------------------------------------
*/

async function sendMessage() {

  if (state.sending) {
    return;
  }

  const message =
    input?.value.trim();


  if (!message) {

    input?.focus();

    return;

  }


  /*
  |--------------------------------------------------------------------------
  | CREATE CHAT ID
  |--------------------------------------------------------------------------
  */

  if (!state.currentChatId) {

    state.currentChatId =
      createId();

  }


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  state.sending = true;

  setSendingState(true);

  hideWelcome();


  /*
  |--------------------------------------------------------------------------
  | USER MESSAGE
  |--------------------------------------------------------------------------
  */

  addMessage(
    "user",
    message
  );


  /*
  |--------------------------------------------------------------------------
  | CONVERSATION
  |--------------------------------------------------------------------------
  */

  state.conversation.push({

    role: "user",

    content: message

  });


  /*
  |--------------------------------------------------------------------------
  | INPUT CLEAR
  |--------------------------------------------------------------------------
  */

  input.value = "";

  autoResize();


  /*
  |--------------------------------------------------------------------------
  | TYPING
  |--------------------------------------------------------------------------
  */

  const typing =
    addTyping();


  try {

    /*
    |--------------------------------------------------------------------------
    | API
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | HTTP ERROR
    |--------------------------------------------------------------------------
    */

    if (!response.ok) {

      let errorMessage =
        "Senn AI mengalami masalah.";

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

        // Response bukan JSON.

      }

      throw new Error(
        errorMessage
      );

    }


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    const data =
      await response.json();


    removeTyping(
      typing
    );


    /*
    |--------------------------------------------------------------------------
    | ANSWER
    |--------------------------------------------------------------------------
    */

    const answer =
      extractAnswer(data);


    addMessage(
      "assistant",
      answer,
      data
    );


    /*
    |--------------------------------------------------------------------------
    | SAVE AI MESSAGE
    |--------------------------------------------------------------------------
    */

    state.conversation.push({

      role: "assistant",

      content: answer

    });


    /*
    |--------------------------------------------------------------------------
    | SAVE HISTORY
    |--------------------------------------------------------------------------
    */

    saveCurrentChat(
      message
    );


  } catch (error) {

    console.error(
      "[SENN AI ERROR]",
      error
    );


    removeTyping(
      typing
    );


    const message =
      error?.message ||
      "Server tidak dapat dihubungi.";


    addMessage(
      "assistant",
      `Maaf, Senn mengalami kendala.\n\n${message}`
    );


  } finally {

    state.sending = false;

    setSendingState(false);

    input?.focus();

  }

}


/*
|--------------------------------------------------------------------------
| EXTRACT ANSWER
|--------------------------------------------------------------------------
*/

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
