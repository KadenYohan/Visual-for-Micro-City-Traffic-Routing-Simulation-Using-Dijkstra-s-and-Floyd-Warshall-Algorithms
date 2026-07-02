// ===========================================================================
//  DIJKSTRA'S ALGORITHM — JavaScript implementation
//
//  Conforms to the official document (Section 4.3 Code Format):
//
//  while priority_queue:
//      current_distance, current_node = heapq.heappop(priority_queue)
//      if current_node == destination: break
//      if current_node in visited: continue
//      visited.add(current_node)
//      for neighbor, travel_time in graph[current_node].items():
//          new_distance = current_distance + travel_time
//          if new_distance < distances[neighbor]:
//              distances[neighbor] = new_distance
//              previous_nodes[neighbor] = current_node
//              heapq.heappush(priority_queue, (new_distance, neighbor))
//
//  Paradigm  : Greedy (Single-Source Shortest Path)
//  Complexity: Time O((V+E) log V)  |  Space O(V+E)
// ===========================================================================

// ---------------------------------------------------------------------------
//  MinHeap — replaces Python's heapq module
//  Each item is [distance, node]. The heap always exposes the item with
//  the smallest distance at the top (index 0), mirroring heapq behaviour.
// ---------------------------------------------------------------------------
class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();
        const root = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._bubbleDown(0);
        return root;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    _bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex][0] <= this.heap[index][0]) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    _bubbleDown(index) {
        const length = this.heap.length;
        while (true) {
            let smallest = index;
            const left  = 2 * index + 1;
            const right = 2 * index + 2;
            if (left  < length && this.heap[left][0]  < this.heap[smallest][0]) smallest = left;
            if (right < length && this.heap[right][0] < this.heap[smallest][0]) smallest = right;
            if (smallest === index) break;
            [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
            index = smallest;
        }
    }
}

// ---------------------------------------------------------------------------
//  dijkstra(graph, start, destination)
//
//  Greedy approach: always settle the closest unvisited intersection first.
//  Stops as soon as the destination is popped — its distance is provably
//  final at that point (all weights are positive).
// ---------------------------------------------------------------------------
export function dijkstra(graph, start, destination) {
    // Edge case: start and destination are the same intersection
    if (start === destination) {
        return { path: [start], total_time: 0 };
    }

    // ── STEP 1: Initialise distances and priority queue ──────────────────
    const distances = {};
    for (const node in graph) distances[node] = Infinity;
    distances[start] = 0;

    const previous_nodes = {};
    const priority_queue = new MinHeap();
    priority_queue.push([0, start]);          // (distance_so_far, node)
    const visited = new Set();

    // ── STEP 2: Greedily settle the closest unvisited node ───────────────
    while (!priority_queue.isEmpty()) {
        const [current_distance, current_node] = priority_queue.pop();

        // Early exit — first time destination is popped, distance is final
        if (current_node === destination) break;

        // Skip stale duplicates (node already settled with a shorter path)
        if (visited.has(current_node)) continue;
        visited.add(current_node);

        // ── STEP 3: Relax every edge leaving the settled node ────────────
        for (const neighbor in graph[current_node]) {
            const travel_time  = graph[current_node][neighbor];
            const new_distance = current_distance + travel_time;

            if (new_distance < distances[neighbor]) {
                distances[neighbor]     = new_distance;
                previous_nodes[neighbor] = current_node;
                priority_queue.push([new_distance, neighbor]);
            }
        }
    }

    // ── STEP 4: No route found ───────────────────────────────────────────
    if (distances[destination] === Infinity) {
        return { path: null, total_time: Infinity };
    }

    // ── STEP 5: Reconstruct the actual path by walking previous_nodes ────
    const path = [destination];
    let current = destination;
    while (current !== start) {
        current = previous_nodes[current];
        path.push(current);
    }
    path.reverse();

    return { path, total_time: distances[destination] };
}
