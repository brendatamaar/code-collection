import Parser from "tree-sitter";
import Go from "tree-sitter-go";

export type GoTree = Parser.Tree;

const GO_LANGUAGE = Go as unknown as Parser.Language;

export function parseGoSource(content: string): GoTree {
  const parser = new Parser();
  parser.setLanguage(GO_LANGUAGE);
  return parser.parse(content);
}

export function createGoQuery(source: string): Parser.Query {
  return new Parser.Query(GO_LANGUAGE, source);
}
