/**
 * SENN AI 2.0
 * Tool Registry
 *
 * Semua kemampuan eksternal Senn
 * didaftarkan melalui satu registry.
 */

import {
  searchWeb
} from "./web.js";


/*
|--------------------------------------------------------------------------
| TOOL REGISTRY
|--------------------------------------------------------------------------
*/

const TOOL_REGISTRY = {

  web_search: {

    name:
      "web_search",

    description:
      "Mencari informasi dari internet.",

    category:
      "information",

    requiresInternet:
      true,

    execute:
      async ({
        query
      }) => {

        return await searchWeb({
          query
        });

      }

  }

};


/*
|--------------------------------------------------------------------------
| GET TOOL
|--------------------------------------------------------------------------
*/

export function getTool(
  name
) {

  return TOOL_REGISTRY[name] ||
    null;

}


/*
|--------------------------------------------------------------------------
| CHECK TOOL
|--------------------------------------------------------------------------
*/

export function hasTool(
  name
) {

  return Boolean(
    TOOL_REGISTRY[name]
  );

}


/*
|--------------------------------------------------------------------------
| LIST TOOL NAMES
|--------------------------------------------------------------------------
*/

export function listTools() {

  return Object.keys(
    TOOL_REGISTRY
  );

}


/*
|--------------------------------------------------------------------------
| TOOL INFORMATION
|--------------------------------------------------------------------------
*/

export function getToolInfo() {

  return Object.values(
    TOOL_REGISTRY
  ).map(
    (tool) => ({

      name:
        tool.name,

      description:
        tool.description,

      category:
        tool.category,

      requiresInternet:
        tool.requiresInternet

    })
  );

}


/*
|--------------------------------------------------------------------------
| EXECUTE TOOL
|--------------------------------------------------------------------------
*/

export async function executeTool(
  name,
  input = {}
) {

  const tool =
    getTool(name);


  if (!tool) {

    return {

      success: false,

      tool:
        name,

      error:
        `Tool "${name}" tidak ditemukan.`

    };

  }


  try {

    const result =
      await tool.execute(
        input
      );


    return {

      success: true,

      tool:
        name,

      result

    };

  } catch (error) {

    console.error(
      `[TOOL ERROR] ${name}`,
      error
    );


    return {

      success: false,

      tool:
        name,

      error:
        error.message

    };

  }

}


/*
|--------------------------------------------------------------------------
| EXECUTE MULTIPLE TOOLS
|--------------------------------------------------------------------------
*/

export async function executeTools({

  tools = [],

  input = {}

}) {

  const results = [];


  for (
    const toolName of tools
  ) {

    const result =
      await executeTool(
        toolName,
        input
      );


    results.push(
      result
    );

  }


  return {

    success:
      results.every(
        (result) =>
          result.success
      ),

    results

  };

}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export {
  TOOL_REGISTRY
};
