import "dotenv/config";

const BASE_URL =
  `http://localhost:${process.env.PORT || 3000}`;


/*
|--------------------------------------------------------------------------
| TEST HELPER
|--------------------------------------------------------------------------
*/

async function request(
  endpoint,
  options = {}
) {

  const response =
    await fetch(
      `${BASE_URL}${endpoint}`,
      options
    );


  const data =
    await response.json();


  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log(
    `${options.method || "GET"} ${endpoint}`
  );

  console.log(
    `STATUS: ${response.status}`
  );

  console.log(
    JSON.stringify(
      data,
      null,
      2
    )
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );


  return {
    response,
    data
  };

}


/*
|--------------------------------------------------------------------------
| TEST 1
| SERVER STATUS
|--------------------------------------------------------------------------
*/

async function testStatus() {

  await request(
    "/api/status"
  );

}


/*
|--------------------------------------------------------------------------
| TEST 2
| NORMAL CONVERSATION
|--------------------------------------------------------------------------
*/

async function testConversation() {

  await request(

    "/api/chat",

    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          message:
            "jelasin apa itu artificial intelligence dengan bahasa sederhana",

          conversation:
            []

        })

    }

  );

}


/*
|--------------------------------------------------------------------------
| TEST 3
| SHORT LANGUAGE
|--------------------------------------------------------------------------
*/

async function testShortLanguage() {

  await request(

    "/api/chat",

    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          message:
            "gmn cara bikin website",

          conversation:
            []

        })

      }

  );

}


/*
|--------------------------------------------------------------------------
| TEST 4
| CONTEXT
|--------------------------------------------------------------------------
*/

async function testContext() {

  const conversation = [

    {

      role:
        "user",

      content:
        "Gw lagi bikin website Senn AI"

    },

    {

      role:
        "assistant",

      content:
        "Mantap. Senn AI bisa dikembangkan menjadi AI assistant."

    }

  ];


  await request(

    "/api/chat",

    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          message:
            "lanjut",

          conversation

        })

      }

  );

}


/*
|--------------------------------------------------------------------------
| TEST 5
| CALCULATOR
|--------------------------------------------------------------------------
*/

async function testCalculator() {

  await request(

    "/api/chat",

    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          message:
            "hitung 125 * 24",

          conversation:
            []

        })

      }

  );

}


/*
|--------------------------------------------------------------------------
| TEST 6
| WEB SEARCH
|--------------------------------------------------------------------------
*/

async function testWebSearch() {

  await request(

    "/api/chat",

    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          message:
            "cari informasi teknologi AI terbaru",

          conversation:
            []

        })

      }

  );

}


/*
|--------------------------------------------------------------------------
| RUN
|--------------------------------------------------------------------------
*/

async function main() {

  console.log("");

  console.log(
    "███████╗███████╗███╗   ██╗███╗   ██╗"
  );

  console.log(
    "██╔════╝██╔════╝████╗  ██║████╗  ██║"
  );

  console.log(
    "███████╗█████╗  ██╔██╗ ██║██╔██╗ ██║"
  );

  console.log(
    "╚════██║██╔══╝  ██║╚██╗██║██║╚██╗██║"
  );

  console.log(
    "███████║███████╗██║ ╚████║██║ ╚████║"
  );

  console.log(
    "╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═══╝"
  );

  console.log("");

  console.log(
    "SENN AI V2 SYSTEM TEST"
  );

  console.log(
    `Target: ${BASE_URL}`
  );


  try {

    await testStatus();

    await testConversation();

    await testShortLanguage();

    await testContext();

    await testCalculator();

    await testWebSearch();


    console.log(
      "✓ Semua test selesai."
    );


  } catch (error) {

    console.error("");

    console.error(
      "✕ TEST FAILED"
    );

    console.error(
      error.message
    );

    console.error("");

    console.error(
      "Pastikan server.js sedang berjalan."
    );

  }

}


main();
