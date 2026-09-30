/**
 * SENN AI 2.0
 * Tool Executor
 *
 * Tugas:
 * - menerima execution plan dari Router
 * - menjalankan tool yang diperlukan
 * - mengumpulkan hasil tool
 * - menangani error tool
 * - memberikan hasil terstruktur ke AI Core
 */

import {
  searchWeb
} from "./web.js";


/*
|--------------------------------------------------------------------------
| TOOL REGISTRY
|--------------------------------------------------------------------------
|
| Semua tool didaftarkan di sini.
|
| Nanti:
|
| web_search  → web.js
| calculator  → calculator.js
| weather     → weather.js
| files       → files.js
|
*/

const TOOL_REGISTRY = {

  web_search:
    async ({
      query
    }) => {

      return searchWeb({
        query
      });

    }

};


/*
|--------------------------------------------------------------------------
| CHECK TOOL
|--------------------------------------------------------------------------
*/

export function hasTool(
  toolName
) {

  return Boolean(
    TOOL_REGISTRY[toolName]
  );

}


/*
|--------------------------------------------------------------------------
| LIST TOOLS
|--------------------------------------------------------------------------
*/

export function listTools() {

  return Object.keys(
    TOOL_REGISTRY
  );

}


/*
|--------------------------------------------------------------------------
| EXECUTE SINGLE TOOL
|--------------------------------------------------------------------------
*/

export async function executeTool({

  toolName,

  input = {}

}) {

  const tool =
    TOOL_REGISTRY[toolName];


  if (!tool) {

    return {

      success: false,

      tool:
        toolName,

      error:
        `Tool "${toolName}" is not available.`

    };

  }


  try {

    const result =
      await tool(input);


    return {

      success: true,

      tool:
        toolName,

      result

    };

  } catch (error) {

    console.error(
      `[TOOL ERROR] ${toolName}`,
      error
    );


    return {

      success: false,

      tool:
        toolName,

      error:
        error.message

    };

  }

}


/*
|--------------------------------------------------------------------------
| EXECUTE TOOL PLAN
|--------------------------------------------------------------------------
*/

export async function executeToolPlan({

  execution,

  message

}) {

  if (
    !execution ||
    !Array.isArray(
      execution.tools
    )
  ) {

    return {

      success: true,

      executed: [],

      results: []

    };

  }


  const results = [];


  for (
    const toolName
      of execution.tools
  ) {

    /*
     * Untuk sekarang semua tool
     * menggunakan pesan user sebagai
     * input utama.
     *
     * Nanti kita buat Tool Argument
     * Extraction agar lebih pintar.
     */

    const result =
      await executeTool({

        toolName,

        input: {

          query:
            message,

          message

        }

      });


    results.push(
      result
    );

  }


  return {

    success:
      results.every(
        (item) =>
          item.success
      ),

    executed:
      results.map(
        (item) =>
          item.tool
      ),

    results

  };

}


/*
|--------------------------------------------------------------------------
| FORMAT TOOL RESULTS
|--------------------------------------------------------------------------
|
| Mengubah hasil tool menjadi informasi
| yang mudah dimasukkan ke AI Core.
|
*/

export function formatToolResults(
  results = []
) {

  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {

    return "";

  }


  return results
    .map(
      (item) => {

        if (
          !item.success
        ) {

          return [
            `TOOL: ${item.tool}`,
            `STATUS: ERROR`,
            `ERROR: ${item.error}`
          ].join("\n");

        }


        return [
          `TOOL: ${item.tool}`,
          `STATUS: SUCCESS`,
          `RESULT:`,
          JSON.stringify(
            item.result,
            null,
            2
          )
        ].join("\n");

      }
    )
    .join("\n\n");

}


/*
|--------------------------------------------------------------------------
| TOOL SYSTEM INFO
|--------------------------------------------------------------------------
*/

export function getToolSystemInfo() {

  return {

    availableTools:
      listTools(),

    count:
      listTools().length

  };

}


/*
|--------------------------------------------------------------------------
| EXPORT REGISTRY
|--------------------------------------------------------------------------
*/

export {
  TOOL_REGISTRY
};
