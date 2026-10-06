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
const dark = []
const typography = []
function walk(node, path, out) {
  if ('value' in node) {
    const value = isRef(node.value) ? refToVar(node.value) : node.value
    out.push(`  ${varName(path)}: ${value};`)
    return
  }
  for (const [key, child] of Object.entries(node)) walk(child, [...path, key], out)
}
for (const [group, node] of Object.entries(tokens.semantic)) {
  if (group !== 'typography') {
    walk(node, [group], semantic)
    continue
  }
  for (const [style, props] of Object.entries(node)) {
    const rules = Object.entries(props).filter(([prop]) => prop in TYPO_PROPS).map(([prop, ref]) => {
      const name = varName(['typography', style, TYPO_PROPS[prop]])
      semantic.push(`  ${name}: ${refToVar(ref)};`)
      return `  ${TYPO_PROPS[prop]}: var(${name});`
    })
    typography.push(`.t-${style} {\n${rules.join('\n')}\n}`)
  }
}

// Тёмная тема: те же имена переменных, что у semantic, но другие значения.
for (const [group, node] of Object.entries(tokens['semantic-dark'] ?? {})) {
  if (typeof node === 'object') walk(node, [group], dark)
}

// Планшет: увеличенный набор текстовых стилей (те же переменные, другие значения).
const touch = []
for (const [style, props] of Object.entries(tokens['semantic-touch']?.typography ?? {})) {
  for (const [prop, ref] of Object.entries(props)) {
    if (prop in TYPO_PROPS) touch.push(`    ${varName(['typography', style, TYPO_PROPS[prop]])}: ${refToVar(ref)};`)
  }
}

// Тему можно включить и на отдельном блоке (ролик на экране входа показывает другую тему):
// те же цвета, кроме акцентного, его блок берёт у страницы.
const themed = (lines) => lines.filter((line) => !line.trim().startsWith('--highlight-'))
const darkNames = new Set(dark.map((line) => line.trim().split(':')[0]))
const light = semantic.filter((line) => darkNames.has(line.trim().split(':')[0]))

const css = `/* Сгенерировано из design-tokens.json (npm run tokens). Не редактировать вручную. */

:root {
  /* core: примитивы, в компонентах напрямую не используются */
${core.join('\n')}

  /* semantic: светлая тема (по умолчанию) */
  color-scheme: light;
${semantic.join('\n')}
}

/* semantic-dark: тёмная тема, включается атрибутом data-theme="dark" на <html> */
:root[data-theme='dark'] {
  color-scheme: dark;
${dark.join('\n')}
}

/* Тема на отдельном блоке внутри страницы, какой бы ни была тема самой страницы */
:root [data-theme='dark'] {
  color-scheme: dark;
${themed(dark).join('\n')}
}

:root [data-theme='light'] {
  color-scheme: light;
${themed(light).join('\n')}
}

/* semantic-touch: планшет (экран от 641 до 1024px или сенсорный шире телефона), текст на ступень
   крупнее. На телефоне размеры как на компьютере: крупный текст широкого шрифта там почти
   в каждой строке переносился. */
@media (min-width: 641px) and (max-width: 1024px), (min-width: 641px) and (pointer: coarse) {
  :root {
${touch.join('\n')}
  }
}

/* Текстовые стили из semantic.typography */
${typography.join('\n\n')}
`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, css)
console.log(
  `tokens.css: ${core.length} core, ${semantic.length} semantic, ${dark.length} dark, ${touch.length} touch, ${typography.length} text styles`,
)
