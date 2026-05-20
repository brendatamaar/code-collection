import Parser from "tree-sitter";
import Java from "tree-sitter-java";

export type JavaTree = Parser.Tree;

export function parseFile(content: string): JavaTree {
  const parser = new Parser();
  parser.setLanguage(Java);
  return parser.parse(content);
}

export function createJavaQuery(source: string): Parser.Query {
  return new Parser.Query(Java, source);
}
