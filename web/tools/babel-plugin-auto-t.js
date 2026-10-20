// Build-time i18n: wraps user-visible English text in the pages/components so
// it can be translated at runtime, without hand-editing every string.
//   JSX text            -> <__T>text</__T>
//   attributes          -> attr={__t("text")}         (placeholder, aria-label, ...)
//   child expressions   -> {__t("text")} / {__t("a {0} b", [x])}
// Components that use __t() get a useI18nVersion() hook so they re-render when
// translations arrive. Opt out with translate="no" on an element.

const TEXT_ATTRS = new Set([
  'placeholder', 'aria-label', 'title', 'alt', 'label',
  'subtitle', 'eyebrow', 'actionLabel', 'message',
])
// Property/variable names treated as translatable copy when rendered as
// {x.label} / {label}. Wider set only in files whose data is static site copy
// (never user-generated or already-localised server content).
const BASE_LABEL_NAMES = new Set(['label', 'hint'])
const STATIC_COPY_FILES = /[\\/](Home|About|Contact|Footer|Header|AnnouncementMarquee|TestimonialSlider|LegalPage)\.jsx$/
const STATIC_COPY_NAMES = ['title', 'text', 'description', 'heading', 'after', 'quote', 'category', 'excerpt']
const FILE_EXTRA_IDENTIFIERS = { 'LegalPage.jsx': ['p', 'item'], 'Contact.jsx': ['topic'] }
const SKIP_TEXT_PARENTS = new Set(['code', 'pre', 'script', 'style', 'kbd'])
const STRING_ONLY_PARENTS = new Set(['option', 'textarea', 'title'])
const HAS_LETTER = /\p{L}/u

export default function autoT({ types: t }) {
  function elementName(node) {
    return node && t.isJSXIdentifier(node.name) ? node.name.name : null
  }

  function isSkipped(path) {
    let p = path.parentPath
    while (p) {
      if (p.isJSXElement()) {
        const name = elementName(p.node.openingElement)
        if (name === '__T' || name === 'T') return true
        const noTranslate = p.node.openingElement.attributes.some(
          (a) => t.isJSXAttribute(a) && a.name.name === 'translate' && t.isStringLiteral(a.value) && a.value.value === 'no'
        )
        if (noTranslate) return true
      }
      p = p.parentPath
    }
    return false
  }

  function fnName(fn) {
    if (fn.isFunctionDeclaration()) return fn.node.id?.name
    if (fn.parentPath.isVariableDeclarator() && t.isIdentifier(fn.parentPath.node.id)) return fn.parentPath.node.id.name
    if (fn.isFunctionExpression() && fn.node.id) return fn.node.id.name
    return null
  }

  function ensureHook(path, state) {
    let fn = path.findParent((p) => p.isFunction())
    while (fn) {
      const name = fnName(fn)
      if (name && /^[A-Z]/.test(name)) break
      fn = fn.findParent((p) => p.isFunction())
    }
    if (!fn || state.injected.has(fn.node)) return
    state.injected.add(fn.node)
    state.usedRuntime = true
    const call = t.expressionStatement(t.callExpression(t.identifier('__useI18nVersion'), []))
    const body = fn.get('body')
    if (body.isBlockStatement()) {
      body.unshiftContainer('body', call)
    } else {
      fn.node.body = t.blockStatement([call, t.returnStatement(body.node)])
    }
  }

  function cleanJsxText(raw) {
    const lines = raw.split(/\r\n|\n|\r/)
    let lastNonEmpty = 0
    lines.forEach((line, i) => {
      if (/[^ \t]/.test(line)) lastNonEmpty = i
    })
    let str = ''
    lines.forEach((line, i) => {
      let trimmed = line.replace(/\t/g, ' ')
      if (i !== 0) trimmed = trimmed.replace(/^ +/, '')
      if (i !== lines.length - 1) trimmed = trimmed.replace(/ +$/, '')
      if (trimmed) {
        if (i !== lastNonEmpty) trimmed += ' '
        str += trimmed
      }
    })
    return str
  }

  function tCall(text, args) {
    const callArgs = [t.stringLiteral(text)]
    if (args && args.length) callArgs.push(t.arrayExpression(args))
    return t.callExpression(t.identifier('__t'), callArgs)
  }

  // Returns a replacement expression, or null when the node isn't user-visible text.
  function wrapExpression(node, names) {
    if (t.isStringLiteral(node)) {
      const text = node.value.replace(/\s+/g, ' ').trim()
      return HAS_LETTER.test(text) ? tCall(text) : null
    }
    if (t.isTemplateLiteral(node)) {
      let key = ''
      node.quasis.forEach((q, i) => {
        key += q.value.cooked
        if (i < node.expressions.length) key += `{${i}}`
      })
      key = key.replace(/\s+/g, ' ').trim()
      const literalPart = key.replace(/\{\d+\}/g, '')
      return HAS_LETTER.test(literalPart) ? tCall(key, node.expressions) : null
    }
    if (t.isConditionalExpression(node)) {
      const c = wrapExpression(node.consequent, names)
      const a = wrapExpression(node.alternate, names)
      if (!c && !a) return null
      return t.conditionalExpression(node.test, c || node.consequent, a || node.alternate)
    }
    if (t.isLogicalExpression(node)) {
      const r = wrapExpression(node.right, names)
      return r ? t.logicalExpression(node.operator, node.left, r) : null
    }
    if (t.isMemberExpression(node) && !node.computed && t.isIdentifier(node.property) && names.has(node.property.name)) {
      return t.callExpression(t.identifier('__t'), [node])
    }
    if (t.isIdentifier(node) && names.has(node.name)) {
      return t.callExpression(t.identifier('__t'), [node])
    }
    return null
  }

  return {
    name: 'auto-t',
    visitor: {
      Program: {
        enter(path, state) {
          const file = state.filename || ''
          state.active = /[\\/]src[\\/](pages|components)[\\/]/.test(file)
          const names = new Set(BASE_LABEL_NAMES)
          if (STATIC_COPY_FILES.test(file)) {
            STATIC_COPY_NAMES.forEach((n) => names.add(n))
            const base = file.split(/[\\/]/).pop()
            ;(FILE_EXTRA_IDENTIFIERS[base] || []).forEach((n) => names.add(n))
          }
          state.names = names
          state.injected = new WeakSet()
          state.usedRuntime = false
        },
        exit(path, state) {
          if (!state.active || !state.usedRuntime) return
          const imp = t.importDeclaration(
            [
              t.importSpecifier(t.identifier('__T'), t.identifier('T')),
              t.importSpecifier(t.identifier('__t'), t.identifier('translateText')),
              t.importSpecifier(t.identifier('__useI18nVersion'), t.identifier('useI18nVersion')),
            ],
            t.stringLiteral('@i18n')
          )
          path.unshiftContainer('body', imp)
        },
      },

      JSXText(path, state) {
        if (!state.active || path.node._i18n) return
        if (!HAS_LETTER.test(path.node.value)) return
        const parent = path.parentPath
        if (!parent.isJSXElement() && !parent.isJSXFragment()) return
        const parentName = parent.isJSXElement() ? elementName(parent.node.openingElement) : null
        if (parentName && SKIP_TEXT_PARENTS.has(parentName)) return
        if (isSkipped(path)) return

        const cleaned = cleanJsxText(path.node.value)
        const core = cleaned.trim()
        if (!core || !HAS_LETTER.test(core)) return

        if (parentName && STRING_ONLY_PARENTS.has(parentName)) {
          ensureHook(path, state)
          const container = t.jsxExpressionContainer(tCall(core))
          container._i18n = true
          const parts = [container]
          if (cleaned.startsWith(' ')) parts.unshift(Object.assign(t.jsxText(' '), { _i18n: true }))
          if (cleaned.endsWith(' ')) parts.push(Object.assign(t.jsxText(' '), { _i18n: true }))
          path.replaceWithMultiple(parts)
          return
        }

        const nodes = []
        if (cleaned.startsWith(' ')) nodes.push(Object.assign(t.jsxText(' '), { _i18n: true }))
        const textContainer = t.jsxExpressionContainer(t.stringLiteral(core))
        const element = t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('__T'), []),
          t.jsxClosingElement(t.jsxIdentifier('__T')),
          [textContainer],
          false
        )
        nodes.push(element)
        if (cleaned.endsWith(' ')) nodes.push(Object.assign(t.jsxText(' '), { _i18n: true }))
        state.usedRuntime = true
        path.replaceWithMultiple(nodes)
      },

      JSXAttribute(path, state) {
        if (!state.active || path.node._i18n) return
        const name = t.isJSXIdentifier(path.node.name) ? path.node.name.name : null
        if (!name || !TEXT_ATTRS.has(name)) return
        if (isSkipped(path)) return
        const value = path.node.value
        let replacement = null
        if (t.isStringLiteral(value)) replacement = wrapExpression(value, state.names)
        else if (t.isJSXExpressionContainer(value)) replacement = wrapExpression(value.expression, state.names)
        if (!replacement) return
        ensureHook(path, state)
        state.usedRuntime = true
        path.node._i18n = true
        path.node.value = t.jsxExpressionContainer(replacement)
      },

      JSXExpressionContainer(path, state) {
        if (!state.active || path.node._i18n) return
        const parent = path.parentPath
        if (!parent.isJSXElement() && !parent.isJSXFragment()) return
        if (parent.isJSXElement()) {
          const name = elementName(parent.node.openingElement)
          if (name === '__T' || name === 'T') return
        }
        if (isSkipped(path)) return
        const replacement = wrapExpression(path.node.expression, state.names)
        if (!replacement) return
        ensureHook(path, state)
        state.usedRuntime = true
        path.node._i18n = true
        path.node.expression = replacement
      },
    },
  }
}
