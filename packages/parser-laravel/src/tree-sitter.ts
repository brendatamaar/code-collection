import Parser from "tree-sitter";
import Php from "tree-sitter-php";

export type PhpTree = Parser.Tree;

const PHP_LANGUAGE = Php.php as unknown as Parser.Language;

export function parsePhpSource(content: string): PhpTree {
  const parser = new Parser();
  parser.setLanguage(PHP_LANGUAGE);
  return parser.parse(content);
}

export function createPhpQuery(source: string): Parser.Query {
  return new Parser.Query(PHP_LANGUAGE, source);
}
