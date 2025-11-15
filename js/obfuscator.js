// === RedFox Luau Obfuscator Core ===
// Fixed: No more SyntaxError or luaparse undefined

function buildScopeAST(code) {
  try {
    return luaparse.parse(code, { scope: true, locations: true });
  } catch (e) {
    throw new Error("Parse Error: " + e.message);
  }
}

function fullObfuscate(ast) {
  // Simple variable renaming (example)
  const scopeMap = new Map();
  let counter = 0;

  function rename(node) {
    if (node.type === "Identifier" && !scopeMap.has(node.name)) {
      scopeMap.set(node.name, `_v${counter++}`);
    }
    if (scopeMap.has(node.name)) {
      node.name = scopeMap.get(node.name);
    }
  }

  function traverse(node) {
    if (!node) return;
    if (node.type === "Identifier") rename(node);
    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        if (Array.isArray(node[key])) {
          node[key].forEach(traverse);
        } else {
          traverse(node[key]);
        }
      }
    }
  }

  traverse(ast);
  return ast;
}

function generateCode(ast) {
  // Very basic codegen (you can improve this)
  function gen(node) {
    if (!node) return "";
    switch (node.type) {
      case "Identifier": return node.name;
      case "Literal": return JSON.stringify(node.value);
      case "BinaryExpression": return `${gen(node.left)} ${node.operator} ${gen(node.right)}`;
      case "CallExpression": return `${gen(node.base)}(${node.arguments.map(gen).join(", ")})`;
      case "FunctionDeclaration":
        return `function ${node.identifier ? gen(node.identifier) : ""}(${node.parameters.map(gen).join(", ")}) ${gen(node.body)} end`;
      case "Chunk": return node.body.map(gen).join("\n");
      case "ReturnStatement": return "return " + node.arguments.map(gen).join(", ");
      default:
        if (node.body) return node.body.map(gen).join("\n");
        return "";
    }
  }
  return gen(ast);
}

function obfuscateLuau(code) {
  try {
    const ast = buildScopeAST(code);
    const obfuscatedAST = fullObfuscate(ast);
    return generateCode(obfuscatedAST);
  } catch (e) {
    return `--[[\n  Obfuscation Failed: ${e.message}\n]]`;
  }
}

// Export for UI
window.obfuscateLuau = obfuscateLuau;
