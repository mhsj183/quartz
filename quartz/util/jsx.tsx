import { Components, Jsx, toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Element, Node, Root, Text } from "hast"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"
import { trace } from "./trace"
import { type FilePath } from "./path"

const customComponents: Components = {
  table: (props) => (
    <div class="table-container">
      <table {...props} />
    </div>
  ),
}

export function htmlToJsx(fp: FilePath, tree: Node) {
  try {
    return toJsxRuntime(removeBlankParagraphs(tree) as Root, {
      Fragment,
      jsx: jsx as Jsx,
      jsxs: jsxs as Jsx,
      elementAttributeNameCase: "html",
      components: customComponents,
    })
  } catch (e) {
    trace(`Failed to parse Markdown in \`${fp}\` into JSX`, e as Error)
  }
}

type ParentNode = Node & { children?: Node[] }

function removeBlankParagraphs(node: Node): Node {
  const parent = node as ParentNode

  if (!Array.isArray(parent.children)) {
    return node
  }

  return {
    ...node,
    children: parent.children
      .filter((child) => !isBlankParagraph(child))
      .map((child) => removeBlankParagraphs(child)),
  } as Node
}

function isBlankParagraph(node: Node): boolean {
  return (
    isElement(node) &&
    node.tagName === "p" &&
    Array.isArray(node.children) &&
    node.children.every(isWhitespaceOnlyNode)
  )
}

function isWhitespaceOnlyNode(node: Node): boolean {
  if (isText(node)) {
    return node.value.replace(/\u00a0/g, " ").trim().length === 0
  }

  if (!isElement(node)) {
    return true
  }

  if (node.tagName === "br") {
    return true
  }

  return Array.isArray(node.children) && node.children.every(isWhitespaceOnlyNode)
}

function isElement(node: Node): node is Element {
  return node.type === "element"
}

function isText(node: Node): node is Text {
  return node.type === "text"
}
