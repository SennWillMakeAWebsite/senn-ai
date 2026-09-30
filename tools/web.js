/**
 * SENN AI 2.0
 * Web Intelligence Tool
 *
 * Tugas:
 * - melakukan web search melalui AI provider
 * - mengambil informasi terkini
 * - mengembalikan sumber
 * - memisahkan hasil web dari jawaban AI
 *
 * Web search TIDAK selalu dijalankan.
 * Router hanya memanggil tool ini ketika informasi
 * eksternal / terkini memang dibutuhkan.
 */

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";


/*
|--------------------------------------------------------------------------
| WEB SEARCH TOOL CONFIG
|--------------------------------------------------------------------------
*/

const WEB_SEARCH_TOOL = {
  type: "web_search"
};


/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
*/

export async function webSearch({
  query,
  model =
    process.env.AI_MODEL ||
    "gpt-5.6-luna"
}) {

  if (
    !query ||
    typeof query !== "string" ||
    !query.trim()
  ) {

    throw new Error(
      "Web search query is required."
    );

  }


  const apiKey =
    process.env.AI_API_KEY;


  if (!apiKey) {

    throw new Error(
      "AI_API_KEY is not configured."
    );

  }


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
          JSON.stringify({

            model,

            tools: [
              WEB_SEARCH_TOOL
            ],

            input: query,

            store: false

          })

      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      `Web search failed (${response.status}): ${errorText}`
    );

  }


  const data =
    await response.json();


  return parseWebResponse(
    data
  );
}


/*
|--------------------------------------------------------------------------
| PARSE RESPONSE
|--------------------------------------------------------------------------
*/

function parseWebResponse(
  response
) {

  const sources = [];

  const output =
    Array.isArray(response?.output)
      ? response.output
      : [];


  for (
    const item of output
  ) {

    /*
     * Web search result.
     */

    if (
      item?.type ===
      "web_search_call"
    ) {

      continue;

    }


    /*
     * AI message containing
     * web citations / annotations.
     */

    if (
      item?.type === "message" &&
      Array.isArray(item.content)
    ) {

      for (
        const content of item.content
      ) {

        if (
          content?.type !==
          "output_text"
        ) {

          continue;

        }


        const annotations =
          Array.isArray(
            content.annotations
          )
            ? content.annotations
            : [];


        for (
          const annotation
            of annotations
        ) {

          if (
            annotation?.type ===
            "url_citation"
          ) {

            sources.push({

              title:
                annotation.title ||
                "Web Source",

              url:
                annotation.url,

              startIndex:
                annotation.start_index,

              endIndex:
                annotation.end_index

            });

          }

        }

      }

    }

  }


  /*
   * Extract response text.
   */

  const text =
    typeof response?.output_text ===
    "string"
      ? response.output_text
      : "";


  /*
   * Remove duplicate sources.
   */

  const uniqueSources = [
    ...new Map(
      sources
        .filter(
          (source) =>
            source.url
        )
        .map(
          (source) => [
            source.url,
            source
          ]
        )
    ).values()
  ];


  return {

    success: true,

    text,

    sources:
      uniqueSources,

    responseId:
      response.id || null

  };

}


/*
|--------------------------------------------------------------------------
| SEARCH + STRUCTURED RESULT
|--------------------------------------------------------------------------
*/

export async function searchWeb({
  query,
  model
}) {

  const result =
    await webSearch({
      query,
      model
    });


  return {

    query,

    answer:
      result.text,

    sources:
      result.sources,

    responseId:
      result.responseId

  };

}


/*
|--------------------------------------------------------------------------
| SOURCE VALIDATION
|--------------------------------------------------------------------------
*/

export function validateSources(
  sources = []
) {

  if (
    !Array.isArray(sources)
  ) {

    return [];

  }


  return sources
    .filter(
      (source) =>
        source &&
        typeof source.url ===
          "string"
    )
    .map(
      (source) => ({

        title:
          source.title ||
          "Web Source",

        url:
          source.url

      })
    );

}


/*
|--------------------------------------------------------------------------
| TOOL METADATA
|--------------------------------------------------------------------------
*/

export function getWebToolInfo() {

  return {

    name:
      "web_search",

    description:
      "Search the internet for current or external information.",

    capabilities: [

      "current information",

      "recent information",

      "news",

      "public web pages",

      "external knowledge"

    ]

  };

  }
