import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const TARGET_DIRS = ['src']
const LEGACY_PATHS = ['/login', '/profile', '/pizzerias', '/agenda', '/planner', '/visits']
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function walk(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }
    files.push(fullPath)
  }
  return files
}

function getExt(path) {
  const i = path.lastIndexOf('.')
  return i === -1 ? '' : path.slice(i)
}

function isLegacyPath(value) {
  return LEGACY_PATHS.some((legacy) => value === legacy || value.startsWith(`${legacy}/`) || value.startsWith(`${legacy}?`))
}

function getLineAndCol(text, pos) {
  const upTo = text.slice(0, pos)
  const lines = upTo.split('\n')
  return { line: lines.length, col: lines.at(-1)?.length ?? 0 }
}

function scanFile(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true)
  const violations = []

  function report(node, value, context) {
    if (!isLegacyPath(value)) return
    const { line, col } = getLineAndCol(text, node.getStart(sourceFile))
    violations.push({ filePath, line, col: col + 1, value, context })
  }

  function getStringLiteralValue(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
    return null
  }

  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.text === 'href' && node.initializer && ts.isStringLiteral(node.initializer)) {
      report(node.initializer, node.initializer.text, 'jsx-href')
    }

    if (ts.isCallExpression(node)) {
      const expr = node.expression
      const args = node.arguments

      // redirect('/path') / permanentRedirect('/path')
      if (ts.isIdentifier(expr) && (expr.text === 'redirect' || expr.text === 'permanentRedirect')) {
        const value = args[0] ? getStringLiteralValue(args[0]) : null
        if (value) report(args[0], value, expr.text)
      }

      // router.push('/path') / router.replace('/path')
      if (ts.isPropertyAccessExpression(expr) && (expr.name.text === 'push' || expr.name.text === 'replace')) {
        const value = args[0] ? getStringLiteralValue(args[0]) : null
        if (value) report(args[0], value, `router.${expr.name.text}`)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

const files = TARGET_DIRS.flatMap((dir) => walk(join(ROOT, dir))).filter((file) => FILE_EXTENSIONS.has(getExt(file)))
const violations = files.flatMap(scanFile)

if (violations.length > 0) {
  console.error('Found legacy route references in source files:')
  for (const v of violations) {
    const rel = v.filePath.slice(ROOT.length + 1)
    console.error(`- ${rel}:${v.line}:${v.col} [${v.context}] ${v.value}`)
  }
  process.exit(1)
}

console.log('Canonical route check passed.')
