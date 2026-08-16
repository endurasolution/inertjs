const TYPE = {
  STATIC: 0,
  DYNAMIC: 1,
  CATCH_ALL: 2
};

class RouterNode {
  constructor(segment = '', type = TYPE.STATIC, paramName = null) {
    this.segment = segment;
    this.type = type;
    this.paramName = paramName;
    this.staticChildren = new Map();
    this.dynamicChild = null;
    this.catchAllChild = null;
    this.route = null; // Will store the route payload if this node is an endpoint
  }
}

export class RouterTrie {
  constructor() {
    this.root = new RouterNode();
  }

  /**
   * Inserts a route into the radix trie.
   * 
   * @param {string[]} segments The URL path segments (e.g., ['blog', '[slug]'])
   * @param {object} route The route payload to store at this node
   */
  insert(segments, route) {
    let curr = this.root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (seg.startsWith('$')) {
        // Catch-all
        const paramName = seg.slice(1);
        if (!curr.catchAllChild) {
          curr.catchAllChild = new RouterNode(seg, TYPE.CATCH_ALL, paramName);
        }
        curr = curr.catchAllChild;
        // Catch-all must be the last segment
        if (i !== segments.length - 1) {
          throw new Error(`E_INERT_ROUTER_CATCHALL: Catch-all segment '${seg}' must be the last segment.`);
        }
      } else if (seg.startsWith('[') && seg.endsWith(']')) {
        // Dynamic
        const paramName = seg.slice(1, -1);
        if (!curr.dynamicChild) {
          curr.dynamicChild = new RouterNode(seg, TYPE.DYNAMIC, paramName);
        } else if (curr.dynamicChild.paramName !== paramName) {
           throw new Error(`E_INERT_ROUTER_PARAM: Conflicting dynamic parameters '${curr.dynamicChild.paramName}' and '${paramName}' at same level.`);
        }
        curr = curr.dynamicChild;
      } else {
        // Static
        if (!curr.staticChildren.has(seg)) {
          curr.staticChildren.set(seg, new RouterNode(seg, TYPE.STATIC));
        }
        curr = curr.staticChildren.get(seg);
      }
    }

    if (curr.route) {
      throw new Error(`E_INERT_ROUTER_CONFLICT: Route conflict at path '/${segments.join('/')}'`);
    }
    curr.route = route;
  }

  /**
   * Matches a URL path against the trie.
   * Matching is O(path segments) with zero regex backtracking.
   * Precedence: Static > Dynamic > Catch-all.
   * 
   * @param {string[]} segments The URL path segments to match (e.g., ['blog', 'hello-world'])
   * @returns {object|null} The matched route and extracted params, or null.
   */
  match(segments) {
    let params = {};
    const route = this._matchNode(this.root, segments, 0, params);
    
    if (route) {
      return { route, params };
    }
    return null;
  }

  _matchNode(node, segments, index, params) {
    if (index === segments.length) {
      // Reached the end of the URL
      if (node.route) return node.route;
      
      // If we are at the end, but the node has a catch-all child, the catch-all can match an empty remainder
      // Wait, standard catch-all usually requires at least one segment, or matches 0-or-more. 
      // Next.js catch-all matches 1-or-more. Optional catch-all matches 0-or-more.
      // The spec just says `*name` = catch-all. Let's make it match 0-or-more for flexibility,
      // or strictly 1-or-more. If it's 1-or-more, we don't check here. Let's make it 1-or-more to match the segments structure.
      return null;
    }

    const seg = segments[index];

    // 1. Try static first (highest precedence)
    const staticChild = node.staticChildren.get(seg);
    if (staticChild) {
      const route = this._matchNode(staticChild, segments, index + 1, params);
      if (route) return route;
    }

    // 2. Try dynamic (medium precedence)
    if (node.dynamicChild) {
      const prevParam = params[node.dynamicChild.paramName];
      params[node.dynamicChild.paramName] = seg; // Extract param
      
      const route = this._matchNode(node.dynamicChild, segments, index + 1, params);
      if (route) return route;
      
      // Backtrack params if match failed (not regex backtracking, just variable restoration)
      if (prevParam !== undefined) {
         params[node.dynamicChild.paramName] = prevParam;
      } else {
         delete params[node.dynamicChild.paramName];
      }
    }

    // 3. Try catch-all (lowest precedence)
    if (node.catchAllChild) {
      params[node.catchAllChild.paramName] = segments.slice(index);
      // Catch-all consumes the rest of the segments
      if (node.catchAllChild.route) return node.catchAllChild.route;
      
      delete params[node.catchAllChild.paramName];
    }

    return null;
  }

  /**
   * Flattens the trie for printing/mapping (useful for `inert map`)
   */
  getFlattenedRoutes() {
    const routes = [];
    
    function traverse(node, pathSegments) {
      if (node.route) {
        routes.push({
          path: '/' + pathSegments.join('/'),
          route: node.route
        });
      }
      
      for (const child of node.staticChildren.values()) {
        traverse(child, [...pathSegments, child.segment]);
      }
      
      if (node.dynamicChild) {
        traverse(node.dynamicChild, [...pathSegments, node.dynamicChild.segment]);
      }
      
      if (node.catchAllChild) {
        traverse(node.catchAllChild, [...pathSegments, node.catchAllChild.segment]);
      }
    }
    
    traverse(this.root, []);
    return routes;
  }
}
