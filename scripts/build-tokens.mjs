// Генерирует src/styles/tokens.css из design-tokens.json.
// Имя переменной = путь токена через дефис: semantic.bg.primary -> --bg-primary,
// core.Neutral.100 -> --core-neutral-100. Семантика ссылается на core через var().
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = JSON.parse(readFileSync(resolve(root, 'design-tokens.json'), 'utf8'))
const outFile = resolve(root, 'src/styles/tokens.css')

const FONT_FALLBACK = 'system-ui, sans-serif'
const PX_GROUPS = new Set(['Radius', 'Space', 'FontSize', 'LineHeight'])
const TYPO_PROPS = {
  fontFamily: 'font-family',
  fontWeight: 'font-weight',
  fontSize: 'font-size',
  lineHeight: 'line-height',
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
const varName = (path) => `--${path.map(kebab).join('-')}`
const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v)

function refToVar(ref) {
  const path = ref.slice(1, -1).split('.')
  let node = tokens
  for (const key of path) node = node?.[key]
  if (node === undefined) throw new Error(`Токен не найден: ${ref}`)
  return `var(${varName(path)})`
}

function coreValue(group, value) {
  if (group === 'FontFamily') return `'${value}', ${FONT_FALLBACK}`
  if (PX_GROUPS.has(group)) return `${value}px`
  return String(value)
}

const core = []
for (const [group, items] of Object.entries(tokens.core)) {
  for (const [key, token] of Object.entries(items)) {
    core.push(`  ${varName(['core', group, key])}: ${coreValue(group, token.value)};`)
  }
}

const semantic = []
const typography = []
function walk(node, path) {
  if ('value' in node) {
    const value = isRef(node.value) ? refToVar(node.value) : node.value
    semantic.push(`  ${varName(path)}: ${value};`)
    return
  }
  for (const [key, child] of Object.entries(node)) walk(child, [...path, key])
}
for (const [group, node] of Object.entries(tokens.semantic)) {
  if (group !== 'typography') {
    walk(node, [group])
    continue
  }
  for (const [style, props] of Object.entries(node)) {
    const rules = Object.entries(props).map(([prop, ref]) => {
      const name = varName(['typography', style, TYPO_PROPS[prop]])
      semantic.push(`  ${name}: ${refToVar(ref)};`)
      return `  ${TYPO_PROPS[prop]}: var(${name});`
    })
    typography.push(`.t-${style} {\n${rules.join('\n')}\n}`)
  }
}

const css = `/* Сгенерировано из design-tokens.json (npm run tokens). Не редактировать вручную. */

:root {
  /* core: примитивы, в компонентах напрямую не используются */
${core.join('\n')}

  /* semantic */
${semantic.join('\n')}
}

/* Текстовые стили из semantic.typography */
${typography.join('\n\n')}
`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, css)
console.log(`tokens.css: ${core.length} core, ${semantic.length} semantic, ${typography.length} text styles`)
