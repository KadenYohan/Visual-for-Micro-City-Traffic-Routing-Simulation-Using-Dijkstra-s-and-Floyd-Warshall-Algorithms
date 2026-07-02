// ===========================================================================
//  FLOYD-WARSHALL ALGORITHM — JavaScript implementation
//
//  Conforms to the official document (Section 4.3 Code Format):
//
//  for k in nodes:
//      for i in nodes:
//          for j in nodes:
//              if dist[i][k] == math.inf or dist[k][j] == math.inf:
//                  continue
//              path_through_k = dist[i][k] + dist[k][j]
//              if path_through_k < dist[i][j]:
//                  dist[i][j] = path_through_k
//                  next_node[i][j] = next_node[i][k]
//
//  Paradigm  : Dynamic Programming (All-Pairs Shortest Path)
//  Complexity: Time O(V³)  |  Space O(V²)
// ===========================================================================

// ---------------------------------------------------------------------------
//  floyd_warshall(graph)
//
//  Builds the full V×V distance matrix in a single run.
//  After processing intermediate node k, dist[i][j] holds the shortest path
//  from i to j using only nodes {0..k} as intermediates.  By the end,
//  all V nodes have been tried — dist contains true global optima.
// ---------------------------------------------------------------------------
export function floyd_warshall(graph) {
    const nodes = Object.keys(graph);

    // ── STEP 1: Initialise dist and next_node tables ──────────────────────
    // dist[i][j]      = Infinity unless a direct edge exists
    // next_node[i][j] = null    unless a direct edge exists (then = j)
    const dist      = {};
    const next_node = {};

    for (const i of nodes) {
        dist[i]      = {};
        next_node[i] = {};
        for (const j of nodes) {
            dist[i][j]      = Infinity;
            next_node[i][j] = null;
        }
    }

    // Every node costs 0 to reach from itself
    for (const node of nodes) {
        dist[node][node] = 0;
    }

    // Seed from direct edge weights
    for (const u in graph) {
        for (const v in graph[u]) {
            dist[u][v]      = graph[u][v];
            next_node[u][v] = v;   // first step from u toward v is v itself
        }
    }

    // ── STEP 2: Triple-nested DP loop (the heart of Floyd-Warshall) ───────
    for (const k of nodes) {           // potential intermediate node
        for (const i of nodes) {       // source
            for (const j of nodes) {   // destination

                // Skip pairs where either leg is unreachable
                if (dist[i][k] === Infinity || dist[k][j] === Infinity) {
                    continue;
                }

                const path_through_k = dist[i][k] + dist[k][j];

                if (path_through_k < dist[i][j]) {
                    dist[i][j]      = path_through_k;
                    next_node[i][j] = next_node[i][k]; // follow i→k's first step
                }
            }
        }
    }

    return { dist, next_node };
}

// ---------------------------------------------------------------------------
//  reconstruct_fw_path(next_node, start, end)
//
//  Traces the actual sequence of intersections using the next_node pointer
//  table built by floyd_warshall(). O(V) per query.
// ---------------------------------------------------------------------------
export function reconstruct_fw_path(next_node, start, end) {
    if (next_node[start][end] === null) return null;

    const path = [start];
    let current = start;

    while (current !== end) {
        current = next_node[current][end];
        path.push(current);
        // Safety guard against malformed graphs
        if (path.length > Object.keys(next_node).length + 1) return null;
    }

    return path;
}
