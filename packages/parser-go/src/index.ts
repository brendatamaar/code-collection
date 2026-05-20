import type { Parser } from "@code-collection/core";

import { detect } from "./detect.js";
import { parse } from "./parse.js";

export const goParser: Parser = {
  name: "go",
  detect,
  parse
};

export { detect };
export { parse };
