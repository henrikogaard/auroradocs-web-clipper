const TEXT_NODE = 3
const ELEMENT_NODE = 1

const BLOCK_TAGS = new Set([
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'LI',
  'MAIN',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'UL',
])

export function htmlToBlocks(html, baseUrl = null) {
  if (!html?.trim() || typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return htmlNodesToBlocks(doc.body.childNodes, { baseUrl })
}

export function htmlNodesToBlocks(nodes, options = {}) {
  return blocksFromChildren(nodes, {
    baseUrl: typeof options.baseUrl === 'string' ? options.baseUrl : null,
  })
}

function blocksFromChildren(nodes, context) {
  const blocks = []
  let inlineBuffer = []

  for (const node of toArray(nodes)) {
    if (isInlineNode(node)) {
      inlineBuffer = inlineBuffer.concat(inlineNodes(node, [], context))
      continue
    }

    flushInlineBuffer()
    blocks.push(...blocksFromNode(node, context))
  }

  flushInlineBuffer()
  return blocks.filter(hasBlockContent)

  function flushInlineBuffer() {
    if (!inlineBuffer.length) return
    blocks.push({ type: 'paragraph', content: inlineBuffer })
    inlineBuffer = []
  }
}

function blocksFromNode(node, context) {
  if (isTextNode(node)) {
    const content = inlineNodes(node, [], context)
    return content.length ? [{ type: 'paragraph', content }] : []
  }
  if (!isElementNode(node)) return []

  const tagName = getTagName(node)
  if (/^H[1-6]$/.test(tagName)) {
    return [{
      type: 'heading',
      attrs: { level: Number(tagName.slice(1)) },
      content: inlineNodesFromChildren(node.childNodes, [], context),
    }]
  }
  if (tagName === 'P') {
    return [{ type: 'paragraph', content: inlineNodesFromChildren(node.childNodes, [], context) }]
  }
  if (tagName === 'UL' || tagName === 'OL') {
    return [listBlockFromNode(node, tagName === 'OL', context)]
  }
  if (tagName === 'LI') {
    return [{ type: 'listItem', content: listItemContent(node, context) }]
  }
  if (tagName === 'BLOCKQUOTE') {
    const content = blocksFromChildren(node.childNodes, context)
    return [{ type: 'blockquote', content: content.length ? content : [{ type: 'paragraph' }] }]
  }
  if (tagName === 'PRE') {
    return [{ type: 'codeBlock', content: [{ type: 'text', text: textContent(node) }] }]
  }

  if (hasBlockChild(node)) {
    return blocksFromChildren(node.childNodes, context)
  }

  const content = inlineNodesFromChildren(node.childNodes, [], context)
  return content.length ? [{ type: 'paragraph', content }] : []
}

function listBlockFromNode(node, ordered, context) {
  const listItems = elementChildren(node)
    .filter((child) => getTagName(child) === 'LI')
    .map((child) => ({ type: 'listItem', content: listItemContent(child, context) }))
    .filter(hasBlockContent)

  return {
    type: ordered ? 'orderedList' : 'bulletList',
    content: listItems.length ? listItems : [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
  }
}

function listItemContent(node, context) {
  const content = blocksFromChildren(node.childNodes, context)
  return content.length ? content : [{ type: 'paragraph' }]
}

function inlineNodesFromChildren(nodes, marks = [], context) {
  return toArray(nodes).flatMap((node) => inlineNodes(node, marks, context))
}

function inlineNodes(node, marks = [], context) {
  if (isTextNode(node)) {
    const text = textContent(node)
    return text ? [{ type: 'text', text, ...(marks.length ? { marks } : {}) }] : []
  }
  if (!isElementNode(node)) return []

  const tagName = getTagName(node)
  if (tagName === 'BR') return [{ type: 'text', text: '\n', ...(marks.length ? { marks } : {}) }]
  if (tagName === 'STRONG' || tagName === 'B') {
    return inlineNodesFromChildren(node.childNodes, addMark(marks, { type: 'bold' }), context)
  }
  if (tagName === 'EM' || tagName === 'I') {
    return inlineNodesFromChildren(node.childNodes, addMark(marks, { type: 'italic' }), context)
  }
  if (tagName === 'A') {
    const href = node.getAttribute?.('href')?.trim()
    return inlineNodesFromChildren(
      node.childNodes,
      href ? addMark(marks, { type: 'link', attrs: { href: resolveHref(href, context), target: '_blank' } }) : marks,
      context,
    )
  }
  if (isBlockNode(node)) {
    return [{ type: 'text', text: textContent(node), ...(marks.length ? { marks } : {}) }]
  }
  return inlineNodesFromChildren(node.childNodes, marks, context)
}

function addMark(marks, mark) {
  if (marks.some((existing) => existing.type === mark.type)) return marks
  return [...marks, mark]
}

function isInlineNode(node) {
  if (isTextNode(node)) return Boolean(textContent(node).trim())
  return isElementNode(node) && !isBlockNode(node)
}

function isBlockNode(node) {
  return isElementNode(node) && BLOCK_TAGS.has(getTagName(node))
}

function hasBlockChild(node) {
  return elementChildren(node).some((child) => BLOCK_TAGS.has(getTagName(child)))
}

function hasBlockContent(block) {
  if (!block) return false
  if (block.type === 'text') return Boolean(block.text)
  if (!Array.isArray(block.content)) return true
  return block.content.length === 0 || block.content.some(hasBlockContent)
}

function isTextNode(node) {
  return node?.nodeType === TEXT_NODE
}

function isElementNode(node) {
  return node?.nodeType === ELEMENT_NODE && typeof node.tagName === 'string'
}

function getTagName(node) {
  return String(node.tagName).toUpperCase()
}

function textContent(node) {
  return node?.textContent ?? ''
}

function elementChildren(node) {
  return toArray(node?.children).filter(isElementNode)
}

function toArray(nodes) {
  return Array.from(nodes ?? [])
}

function resolveHref(href, context) {
  if (!context?.baseUrl) return href
  try {
    return new URL(href, context.baseUrl).href
  } catch {
    return href
  }
}
