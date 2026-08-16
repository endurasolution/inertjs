export function morph(fromNode, toNode) {
  if (fromNode.isEqualNode(toNode)) return;

  if (fromNode.nodeType !== toNode.nodeType || fromNode.tagName !== toNode.tagName) {
    fromNode.replaceWith(toNode.cloneNode(true));
    return;
  }

  if (fromNode.nodeType === Node.TEXT_NODE || fromNode.nodeType === Node.COMMENT_NODE) {
    if (fromNode.nodeValue !== toNode.nodeValue) {
      fromNode.nodeValue = toNode.nodeValue;
    }
    return;
  }

  const fromAttrs = fromNode.attributes;
  const toAttrs = toNode.attributes;
  
  for (let i = fromAttrs.length - 1; i >= 0; i--) {
    const attr = fromAttrs[i];
    if (!toNode.hasAttribute(attr.name)) {
      fromNode.removeAttribute(attr.name);
    }
  }
  for (let i = 0; i < toAttrs.length; i++) {
    const attr = toAttrs[i];
    if (fromNode.getAttribute(attr.name) !== attr.value) {
      fromNode.setAttribute(attr.name, attr.value);
    }
  }

  const fromChildren = Array.from(fromNode.childNodes);
  const toChildren = Array.from(toNode.childNodes);

  const max = Math.max(fromChildren.length, toChildren.length);
  for (let i = 0; i < max; i++) {
    if (!fromChildren[i]) {
      fromNode.appendChild(toChildren[i].cloneNode(true));
    } else if (!toChildren[i]) {
      fromNode.removeChild(fromChildren[i]);
    } else {
      morph(fromChildren[i], toChildren[i]);
    }
  }
}
