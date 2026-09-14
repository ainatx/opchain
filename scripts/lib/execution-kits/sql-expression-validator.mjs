const KEYWORDS = new Set(["AND", "OR", "NULL"]);
const OPERATORS = new Set(["+", "-", "*", "/", "%", "=", "<>", "<", "<=", ">", ">="]);
const UNSUPPORTED_KEYWORDS = new Set(["SELECT", "FROM", "WHERE", "CASE", "CAST", "OVER", "JOIN", "UNION", "ORDER", "GROUP", "LIMIT"]);

function diagnostic(code, message, position = null) {
  return { code, message, position };
}

function unsupported(message, position = null) {
  return { status: "UNSUPPORTED", rendered: null, diagnostics: [diagnostic("UNSUPPORTED_SYNTAX", message, position)], dialect: "postgres" };
}

function invalid(code, message, position = null) {
  return { status: "INVALID", rendered: null, diagnostics: [diagnostic(code, message, position)], dialect: "postgres" };
}

function tokenize(expression) {
  const tokens = [];
  let at = 0;
  while (at < expression.length) {
    const rest = expression.slice(at);
    const whitespace = /^[\t\n\r ]+/.exec(rest);
    if (whitespace) { at += whitespace[0].length; continue; }
    if (rest.startsWith("--") || rest.startsWith("/*") || rest.startsWith(";")) return { unsupported: ["comments and statements are unsupported", at] };
    const string = /^'(?:''|[^'])*'/.exec(rest);
    if (string) { tokens.push({ kind: "string", value: string[0], at }); at += string[0].length; continue; }
    const number = /^(?:0|[1-9]\d*)(?:\.\d+)?/.exec(rest);
    if (number) { tokens.push({ kind: "number", value: number[0], at }); at += number[0].length; continue; }
    const operator = /^(<>|<=|>=|[+\-*/%=<>])/.exec(rest);
    if (operator) { tokens.push({ kind: "operator", value: operator[0], at }); at += operator[0].length; continue; }
    if (rest[0] === "(" || rest[0] === ")" || rest[0] === ",") { tokens.push({ kind: rest[0], value: rest[0], at }); at += 1; continue; }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (word) {
      const upper = word[0].toUpperCase();
      if (UNSUPPORTED_KEYWORDS.has(upper)) return { unsupported: [`keyword ${word[0]} is outside the supported expression grammar`, at] };
      tokens.push({ kind: KEYWORDS.has(upper) ? "keyword" : "identifier", value: upper, raw: word[0], at });
      at += word[0].length;
      continue;
    }
    return { unsupported: [`unsupported token ${JSON.stringify(rest[0])}`, at] };
  }
  tokens.push({ kind: "eof", value: "", at });
  return { tokens };
}

class Parser {
  constructor(tokens, columns, allowedFunctions) {
    this.tokens = tokens;
    this.columns = columns;
    this.allowedFunctions = allowedFunctions;
    this.index = 0;
  }
  peek() { return this.tokens[this.index]; }
  take() { return this.tokens[this.index++]; }
  consume(kind, value) {
    const token = this.peek();
    if (token.kind === kind && (value === undefined || token.value === value)) { this.index += 1; return token; }
    return null;
  }
  expression() { return this.binary("OR", () => this.and()); }
  and() { return this.binary("AND", () => this.compare()); }
  compare() {
    const left = this.additive();
    if (this.peek().kind === "operator" && ["=", "<>", "<", "<=", ">", ">="].includes(this.peek().value)) return { type: "binary", left, op: this.take().value, right: this.additive() };
    return left;
  }
  additive() { return this.binaryOperator(["+", "-"], () => this.multiply()); }
  multiply() { return this.binaryOperator(["*", "/", "%"], () => this.primary()); }
  binary(keyword, next) {
    let value = next();
    while (this.consume("keyword", keyword)) value = { type: "binary", left: value, op: keyword, right: next() };
    return value;
  }
  binaryOperator(operators, next) {
    let value = next();
    while (this.peek().kind === "operator" && operators.includes(this.peek().value)) value = { type: "binary", left: value, op: this.take().value, right: next() };
    return value;
  }
  primary() {
    const token = this.take();
    if (token.kind === "number" || token.kind === "string") return { type: token.kind, value: token.value };
    if (token.kind === "keyword" && token.value === "NULL") return { type: "null" };
    if (token.kind === "(") {
      const value = this.expression();
      if (!this.consume(")")) throw { code: "MALFORMED_EXPRESSION", message: "missing closing parenthesis", position: this.peek().at };
      return { type: "group", value };
    }
    if (token.kind === "identifier") {
      if (this.consume("(")) {
        if (!this.allowedFunctions.has(token.value)) throw { code: "DISALLOWED_FUNCTION", message: `function ${token.raw} is not allowed`, position: token.at };
        const args = [this.expression()];
        while (this.consume(",")) args.push(this.expression());
        if (!this.consume(")")) throw { code: "MALFORMED_EXPRESSION", message: "missing closing function parenthesis", position: this.peek().at };
        return { type: "function", name: token.value, args };
      }
      if (!this.columns.has(token.raw)) throw { code: "UNKNOWN_COLUMN", message: `column ${token.raw} is not supplied`, position: token.at };
      return { type: "identifier", value: token.raw };
    }
    throw { code: "MALFORMED_EXPRESSION", message: "expected a supported expression", position: token.at };
  }
}

function render(node) {
  if (["number", "string", "identifier"].includes(node.type)) return node.value;
  if (node.type === "null") return "NULL";
  if (node.type === "group") return `(${render(node.value)})`;
  if (node.type === "function") return `${node.name.toLowerCase()}(${node.args.map(render).join(", ")})`;
  return `${render(node.left)} ${node.op} ${render(node.right)}`;
}

/** Validates only the small expression grammar in the G1 contract; it never executes SQL. */
export function validateExpression({ expression, dialect, columns, policy }) {
  if (dialect !== "postgres") return unsupported("only the postgres dialect is supported");
  if (typeof expression !== "string" || (policy?.require_nonempty && expression.trim() === "")) return invalid("INVALID_EXPRESSION", "expression must be non-empty");
  if (!Array.isArray(columns) || !columns.every((column) => column && typeof column.name === "string")) return invalid("INVALID_COLUMNS", "columns must be a name list");
  if (!policy || !Array.isArray(policy.allow_functions) || !policy.allow_functions.every((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) return invalid("INVALID_POLICY", "policy.allow_functions must be an identifier list");
  const parsed = tokenize(expression);
  if (parsed.unsupported) return unsupported(...parsed.unsupported);
  try {
    const parser = new Parser(parsed.tokens, new Set(columns.map((column) => column.name)), new Set(policy.allow_functions.map((name) => name.toUpperCase())));
    const tree = parser.expression();
    if (parser.peek().kind !== "eof") return unsupported("syntax outside the supported expression grammar", parser.peek().at);
    return { status: "VALID", rendered: render(tree), diagnostics: [], dialect: "postgres" };
  } catch (error) {
    return invalid(error.code || "MALFORMED_EXPRESSION", error.message || "invalid expression", error.position ?? null);
  }
}

export const SQL_EXPRESSION_GRAMMAR = "postgres expression subset: identifiers, decimal/string/NULL literals, coalesce-style allowed functions, parentheses, arithmetic, comparisons, AND/OR";
