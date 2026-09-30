/**
 * SENN AI 2.0
 * System Test
 *
 * Test:
 * 1. Server
 * 2. Normal AI
 * 3. Web Search
 * 4. Short message
 * 5. Context
 */

const BASE_URL =
  "http://localhost:3000";


async function request(
  endpoint,
  body = null
) {

  const options = {

    method:
      body ? "POST" : "GET",

    headers: {

      "Content-Type":
        "application/json"

    }

  };


  if (body) {

    options.body =
      JSON.stringify(body);

  }


  const response =
    await fetch(
      `${BASE_URL}${endpoint}`,
      options
    );


  const data =
    await response.json();


  return {

    status:
      response.status,

    data

  };

}


/*
|--------------------------------------------------------------------------
| TEST 1
|--------------------------------------------------------------------------
*/

async function testServer() {

  console.log(
    "\n[1] SERVER TEST"
  );


  const result =
    await request(
      "/api/status"
    );


  console.log(
    JSON.stringify(
      result.data,
      null,
      2
    )
  );

}


/*
|--------------------------------------------------------------------------
| TEST 2
|--------------------------------------------------------------------------
*/

async function testNormalAI() {

  console.log(
    "\n[2] NORMAL AI TEST"
  );


  const result =
    await request(

      "/api/chat",

      {

        message:
          "jelasin apa itu HTML secara singkat",

        conversation: [],

        settings: {}

      }

    );


  console.log(
    JSON.stringify(
      result.data,
      null,
      2
    )
  );

}


/*
|--------------------------------------------------------------------------
| TEST 3
|--------------------------------------------------------------------------
*/

async function testWebSearch() {

  console.log(
    "\n[3] WEB SEARCH TEST"
  );


  const result =
    await request(

      "/api/chat",

      {

        message:
          "berita teknologi terbaru hari ini",

        conversation: [],

        settings: {}

      }

    );


  console.log(
    JSON.stringify(
      result.data,
      null,
      2
    )
  );

}


/*
|--------------------------------------------------------------------------
| TEST 4
|--------------------------------------------------------------------------
*/

async function testShortMessage() {

  console.log(
    "\n[4] SHORT MESSAGE TEST"
  );


  const result =
    await request(

      "/api/chat",

      {

        message:
          "gmn?",

        conversation: [

          {

            role:
              "user",

            content:
              "jelasin HTML"

          },

          {

            role:
              "assistant",

            content:
              "HTML adalah bahasa markup..."

          }

        ],

        settings: {}

      }

    );


  console.log(
    JSON.stringify(
      result.data,
      null,
      2
    )
  );

}


/*
|--------------------------------------------------------------------------
| RUN ALL TESTS
|--------------------------------------------------------------------------
*/

async function runTests() {

  console.log(
    "\n======================================"
  );

  console.log(
    "       SENN AI 2.0 SYSTEM TEST"
  );

  console.log(
    "======================================"
  );


  try {

    await testServer();

    await testNormalAI();

    await testWebSearch();

    await testShortMessage();


    console.log(
      "\n======================================"
    );

    console.log(
      "          TEST FINISHED"
    );

    console.log(
      "======================================\n"
    );


  } catch (error) {

    console.error(
      "\nTEST ERROR:"
    );

    console.error(
      error
    );

  }

}


runTests();
