export const CONTEXT = {
  TEXT: 0,
  TAG_NAME: 1,
  ATTR_NAME: 2,
  ATTR_VALUE_UNQUOTED: 3,
  ATTR_VALUE_SINGLE: 4,
  ATTR_VALUE_DOUBLE: 5,
  SCRIPT: 6,
  STYLE: 7,
};

export const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'data', 'manifest', 'poster']);

/**
 * Escapes a string for insertion into a specific HTML context.
 * 
 * @param {string} value The value to escape.
 * @param {number} context The CONTEXT enum value.
 * @param {string} attrName The name of the attribute (if in an attribute context).
 * @returns {string} The escaped string.
 * @throws {Error} If interpolation is hard-refused in this context.
 */
export function escape(value, context, attrName = '') {
  if (value == null) return '';
  const str = String(value);

  switch (context) {
    case CONTEXT.SCRIPT:
    case CONTEXT.STYLE:
      throw new Error(`E_INERT_VECTOR_UNSAFE: Interpolation inside <script> or <style> is hard-refused. Use raw() if absolutely necessary, but be aware of XSS.`);
    
    case CONTEXT.TEXT:
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    case CONTEXT.ATTR_VALUE_DOUBLE:
      if (URL_ATTRIBUTES.has(attrName.toLowerCase())) {
        if (/^\s*javascript:/i.test(str)) {
          throw new Error(`E_INERT_VECTOR_UNSAFE: javascript: URLs are hard-refused in URL attributes.`);
        }
      }
      return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    case CONTEXT.ATTR_VALUE_SINGLE:
      if (URL_ATTRIBUTES.has(attrName.toLowerCase())) {
        if (/^\s*javascript:/i.test(str)) {
          throw new Error(`E_INERT_VECTOR_UNSAFE: javascript: URLs are hard-refused in URL attributes.`);
        }
      }
      return str
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    case CONTEXT.ATTR_VALUE_UNQUOTED:
      if (URL_ATTRIBUTES.has(attrName.toLowerCase())) {
        if (/^\s*javascript:/i.test(str)) {
          throw new Error(`E_INERT_VECTOR_UNSAFE: javascript: URLs are hard-refused in URL attributes.`);
        }
      }
      return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`/g, '&#96;')
        .replace(/\s/g, '&#32;'); // Spaces break unquoted attributes
        
    case CONTEXT.TAG_NAME:
    case CONTEXT.ATTR_NAME:
      // Strictly alphanumeric/dashes for tag/attr names to prevent breaking out
      if (!/^[a-z0-9-]+$/i.test(str)) {
        throw new Error(`E_INERT_VECTOR_UNSAFE: Invalid characters in tag or attribute name interpolation.`);
      }
      return str;
      
    default:
      throw new Error(`E_INERT_VECTOR_UNSAFE: Unknown context ${context}`);
  }
}

/**
 * A basic state machine to determine the HTML context at the end of a string chunk.
 */
export function analyzeTemplateStrings(strings) {
  const statics = [...strings];
  const contexts = [];
  const attrNames = [];
  
  let state = CONTEXT.TEXT;
  let currentAttrName = '';

  for (let i = 0; i < strings.length - 1; i++) {
    const chunk = strings[i];
    
    // We process the chunk character by character to track the state
    for (let j = 0; j < chunk.length; j++) {
      const char = chunk[j];
      
      switch (state) {
        case CONTEXT.TEXT:
          if (char === '<') {
            // Check for </script> or </style>
            if (chunk.startsWith('</script>', j) || chunk.startsWith('</SCRIPT>', j)) {
              j += 8;
            } else if (chunk.startsWith('</style>', j) || chunk.startsWith('</STYLE>', j)) {
              j += 7;
            } else if (chunk.startsWith('!--', j + 1)) {
              // Comment - simplified, just let it be TEXT for now as it's safe to escape
            } else if (chunk.startsWith('script', j + 1) || chunk.startsWith('SCRIPT', j + 1)) {
               state = CONTEXT.TAG_NAME; // Going into script tag definition
            } else if (chunk.startsWith('style', j + 1) || chunk.startsWith('STYLE', j + 1)) {
               state = CONTEXT.TAG_NAME; // Going into style tag definition
            } else {
              state = CONTEXT.TAG_NAME;
            }
          }
          break;
          
        case CONTEXT.TAG_NAME:
          if (/\s/.test(char)) {
            state = CONTEXT.ATTR_NAME;
            currentAttrName = '';
          } else if (char === '>') {
            // Determine if we just opened a script or style
            // We need to look back to see the tag name
            const tagMatch = chunk.substring(0, j).match(/<\s*([a-z0-9-]+)[^>]*$/i);
            const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
            if (tag === 'script') state = CONTEXT.SCRIPT;
            else if (tag === 'style') state = CONTEXT.STYLE;
            else state = CONTEXT.TEXT;
          }
          break;
          
        case CONTEXT.ATTR_NAME:
          if (char === '=') {
            state = CONTEXT.ATTR_VALUE_UNQUOTED;
          } else if (char === '>') {
            const tagMatch = chunk.substring(0, j).match(/<\s*([a-z0-9-]+)[^>]*$/i);
            const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
            if (tag === 'script') state = CONTEXT.SCRIPT;
            else if (tag === 'style') state = CONTEXT.STYLE;
            else state = CONTEXT.TEXT;
          } else if (/\s/.test(char)) {
            // Keep in ATTR_NAME
          } else {
            currentAttrName += char;
          }
          break;
          
        case CONTEXT.ATTR_VALUE_UNQUOTED:
          if (char === '"') {
            state = CONTEXT.ATTR_VALUE_DOUBLE;
          } else if (char === "'") {
            state = CONTEXT.ATTR_VALUE_SINGLE;
          } else if (/\s/.test(char)) {
            state = CONTEXT.ATTR_NAME;
            currentAttrName = '';
          } else if (char === '>') {
            const tagMatch = chunk.substring(0, j).match(/<\s*([a-z0-9-]+)[^>]*$/i);
            const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
            if (tag === 'script') state = CONTEXT.SCRIPT;
            else if (tag === 'style') state = CONTEXT.STYLE;
            else state = CONTEXT.TEXT;
          }
          break;
          
        case CONTEXT.ATTR_VALUE_DOUBLE:
          if (char === '"') {
            state = CONTEXT.ATTR_NAME;
            currentAttrName = '';
          }
          break;
          
        case CONTEXT.ATTR_VALUE_SINGLE:
          if (char === "'") {
            state = CONTEXT.ATTR_NAME;
            currentAttrName = '';
          }
          break;
          
        case CONTEXT.SCRIPT:
          if (char === '<' && (chunk.startsWith('</script>', j) || chunk.startsWith('</SCRIPT>', j))) {
            state = CONTEXT.TAG_NAME; // Closing tag
            j += 8;
          }
          break;
          
        case CONTEXT.STYLE:
           if (char === '<' && (chunk.startsWith('</style>', j) || chunk.startsWith('</STYLE>', j))) {
            state = CONTEXT.TAG_NAME; // Closing tag
            j += 7;
          }
          break;
      }
    }
    
    contexts.push(state);
    attrNames.push(currentAttrName.trim());
  }

  return { statics, contexts, attrNames };
}
