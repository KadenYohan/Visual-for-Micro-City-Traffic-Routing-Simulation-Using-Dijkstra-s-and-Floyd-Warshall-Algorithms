/**
 * MICRO-CITY TRAFFIC ROUTING SIMULATION
 * Dijkstra and Floyd-Warshall Implementations translated from Python
 */

// ---------------------------------------------------------------------------
//  GRAPH DEFINITION — Makati CBD Micro-City Map
// ---------------------------------------------------------------------------
const makati_map = {
    'EDSA_Ayala': {
        'Ayala_Paseo': 4,
        'EDSA_Buendia': 6
    },
    'Ayala_Paseo': {
        'EDSA_Ayala': 4,
        'Ayala_Makati': 3,
        'Buendia_Paseo': 5
    },
    'Ayala_Makati': {
        'Ayala_Paseo': 3,
        'Buendia_Makati': 4
    },
    'Buendia_Makati': {
        'Ayala_Makati': 4,
        'Buendia_Paseo': 3,
        'EDSA_Buendia': 5,
        'Makati_Kalayaan': 3
    },
    'Buendia_Paseo': {
        'Ayala_Paseo': 5,
        'Buendia_Makati': 3,
        'EDSA_Buendia': 4
    },
    'EDSA_Buendia': {
        'EDSA_Ayala': 6,
        'Buendia_Paseo': 4,
        'Buendia_Makati': 5
    },
    'Makati_Kalayaan': {
        'Buendia_Makati': 3
    },
    'Isolated_Node': {}
};

// ---------------------------------------------------------------------------
//  HELPER: MinHeap for Dijkstra (Replacing Python's heapq)
// ---------------------------------------------------------------------------
class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        // item is [distance, node]
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();
        
        const root = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return root;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    bubbleUp(index) {
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex][0] <= this.heap[index][0]) break;
            
            // Swap
            let temp = this.heap[parentIndex];
            this.heap[parentIndex] = this.heap[index];
            this.heap[index] = temp;
            index = parentIndex;
        }
    }

    bubbleDown(index) {
        let length = this.heap.length;
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let smallest = index;

            if (leftChildIndex < length && this.heap[leftChildIndex][0] < this.heap[smallest][0]) {
                smallest = leftChildIndex;
            }
            if (rightChildIndex < length && this.heap[rightChildIndex][0] < this.heap[smallest][0]) {
                smallest = rightChildIndex;
            }
            if (smallest === index) break;

            // Swap
            let temp = this.heap[smallest];
            this.heap[smallest] = this.heap[index];
            this.heap[index] = temp;
            index = smallest;
        }
    }
}

// ===========================================================================
//  CORE ALGORITHM 1 — dijkstra()
// ===========================================================================
function dijkstra(graph, start, destination) {
    if (start === destination) {
        return { path: [start], total_time: 0 };
    }

    const distances = {};
    for (let node in graph) {
        distances[node] = Infinity;
    }
    distances[start] = 0;

    const previous_nodes = {};
    const priority_queue = new MinHeap();
    priority_queue.push([0, start]);
    const visited = new Set();

    while (!priority_queue.isEmpty()) {
        const [current_distance, current_node] = priority_queue.pop();

        if (current_node === destination) {
            break;
        }

        if (visited.has(current_node)) {
            continue;
        }
        visited.add(current_node);

        for (let neighbor in graph[current_node]) {
            let travel_time = graph[current_node][neighbor];
            let new_distance = current_distance + travel_time;

            if (new_distance < distances[neighbor]) {
                distances[neighbor] = new_distance;
                previous_nodes[neighbor] = current_node;
                priority_queue.push([new_distance, neighbor]);
            }
        }
    }

    if (distances[destination] === Infinity) {
        return { path: null, total_time: Infinity };
    }

    const path = [destination];
    let current = destination;
    while (current !== start) {
        current = previous_nodes[current];
        path.push(current);
    }
    path.reverse();

    return { path: path, total_time: distances[destination] };
}

// ===========================================================================
//  CORE ALGORITHM 2 — floyd_warshall() & reconstruct_fw_path()
// ===========================================================================
function floyd_warshall(graph) {
    const nodes = Object.keys(graph);
    
    const dist = {};
    const next_node = {};

    for (let i of nodes) {
        dist[i] = {};
        next_node[i] = {};
        for (let j of nodes) {
            dist[i][j] = Infinity;
            next_node[i][j] = null;
        }
    }

    for (let node of nodes) {
        dist[node][node] = 0;
    }

    for (let u in graph) {
        for (let v in graph[u]) {
            let weight = graph[u][v];
            dist[u][v] = weight;
            next_node[u][v] = v;
        }
    }

    for (let k of nodes) {
        for (let i of nodes) {
            for (let j of nodes) {
                if (dist[i][k] === Infinity || dist[k][j] === Infinity) {
                    continue;
                }
                let path_through_k = dist[i][k] + dist[k][j];
                if (path_through_k < dist[i][j]) {
                    dist[i][j] = path_through_k;
                    next_node[i][j] = next_node[i][k];
                }
            }
        }
    }

    return { dist, next_node };
}

function reconstruct_fw_path(next_node, start, end) {
    if (next_node[start][end] === null) {
        return null;
    }

    const path = [start];
    let current = start;

    while (current !== end) {
        current = next_node[current][end];
        path.push(current);
        if (path.length > Object.keys(next_node).length + 1) {
            return null;
        }
    }

    return path;
}


// ===========================================================================
//  VISUALIZATION LOGIC
// ===========================================================================
const svgCoords = {
    'EDSA_Ayala': { x: 650, y: 100 },
    'Ayala_Paseo': { x: 400, y: 100 },
    'Ayala_Makati': { x: 200, y: 150 },
    'EDSA_Buendia': { x: 650, y: 400 },
    'Buendia_Paseo': { x: 450, y: 300 },
    'Buendia_Makati': { x: 250, y: 400 },
    'Makati_Kalayaan': { x: 80, y: 400 },
    'Isolated_Node': { x: 700, y: 250 }
};

let floydCache = null;

// Draw the static map
function renderMap() {
    const edgesLayer = document.getElementById('edgesLayer');
    const nodesLayer = document.getElementById('nodesLayer');
    const weightsLayer = document.getElementById('weightsLayer');
    
    // Clear layers
    edgesLayer.innerHTML = '';
    nodesLayer.innerHTML = '';
    weightsLayer.innerHTML = '';
    document.getElementById('pathLayer').innerHTML = '';

    const drawnEdges = new Set();

    // Draw Edges and Weights
    for (const node in makati_map) {
        for (const neighbor in makati_map[node]) {
            const edgeId1 = `${node}-${neighbor}`;
            const edgeId2 = `${neighbor}-${node}`;
            
            // Avoid drawing bidirectional edges twice
            if (!drawnEdges.has(edgeId1) && !drawnEdges.has(edgeId2)) {
                drawnEdges.add(edgeId1);
                
                const p1 = svgCoords[node];
                const p2 = svgCoords[neighbor];
                const weight = makati_map[node][neighbor];
                
                // Line
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", p1.x);
                line.setAttribute("y1", p1.y);
                line.setAttribute("x2", p2.x);
                line.setAttribute("y2", p2.y);
                line.setAttribute("class", "edge-line");
                line.setAttribute("id", `edge-${edgeId1}`);
                edgesLayer.appendChild(line);
                
                // Weight Background and Text
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", midX - 10);
                rect.setAttribute("y", midY - 10);
                rect.setAttribute("width", 20);
                rect.setAttribute("height", 20);
                rect.setAttribute("class", "edge-weight-bg");
                
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", midX);
                text.setAttribute("y", midY);
                text.setAttribute("class", "edge-weight-text");
                text.textContent = weight;
                
                weightsLayer.appendChild(rect);
                weightsLayer.appendChild(text);
            }
        }
    }

    // Draw Nodes
    for (const node in svgCoords) {
        const p = svgCoords[node];
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "node-group");
        g.setAttribute("id", `node-${node}`);
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", p.x);
        circle.setAttribute("cy", p.y);
        circle.setAttribute("r", 25);
        circle.setAttribute("class", "node-circle");
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", p.x);
        text.setAttribute("y", p.y + 40); // Label below node
        text.setAttribute("class", "node-text");
        text.textContent = node.replace('_', ' ');
        
        g.appendChild(circle);
        g.appendChild(text);
        nodesLayer.appendChild(g);
    }
}

function clearHighlights() {
    document.querySelectorAll('.node-highlighted').forEach(el => el.classList.remove('node-highlighted'));
    document.getElementById('pathLayer').innerHTML = '';
}

function highlightPath(path) {
    clearHighlights();
    
    if (!path || path.length === 0) return;
    
    const pathLayer = document.getElementById('pathLayer');
    
    // Highlight nodes and edges with a delay
    path.forEach((node, index) => {
        setTimeout(() => {
            document.getElementById(`node-${node}`).classList.add('node-highlighted');
            
            if (index > 0) {
                const prevNode = path[index - 1];
                const p1 = svgCoords[prevNode];
                const p2 = svgCoords[node];
                
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", p1.x);
                line.setAttribute("y1", p1.y);
                line.setAttribute("x2", p2.x);
                line.setAttribute("y2", p2.y);
                line.setAttribute("class", "edge-line-highlighted");
                
                // Animation setup
                const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                line.style.strokeDasharray = length;
                line.style.strokeDashoffset = length;
                
                // Trigger animation
                line.animate([
                    { strokeDashoffset: length },
                    { strokeDashoffset: 0 }
                ], {
                    duration: 300,
                    fill: 'forwards',
                    easing: 'ease-in-out'
                });
                
                pathLayer.appendChild(line);
            }
        }, index * 400); // 400ms delay per step
    });
}

function updateUI(result) {
    const resultsContainer = document.getElementById('results');
    const resultStatus = document.getElementById('resultStatus');
    const resultTime = document.getElementById('resultTime');
    const resultExecTime = document.getElementById('resultExecTime');
    const resultPath = document.getElementById('resultPath');
    
    resultsContainer.classList.remove('hidden');
    
    resultExecTime.textContent = `${result.execTime.toFixed(4)} ms`;
    
    if (result.path === null) {
        resultStatus.textContent = "No path found";
        resultStatus.style.color = "#ff4d4d";
        resultTime.textContent = "∞ mins";
        resultPath.innerHTML = "<span class='path-node'>Unreachable</span>";
        return;
    }
    
    resultStatus.textContent = "Success";
    resultStatus.style.color = "#00e5ff";
    resultTime.textContent = `${result.time} mins`;
    
    resultPath.innerHTML = '';
    result.path.forEach((node, index) => {
        const span = document.createElement('span');
        span.className = 'path-node';
        span.textContent = node;
        resultPath.appendChild(span);
        
        if (index < result.path.length - 1) {
            const nextNode = result.path[index + 1];
            const weight = makati_map[node][nextNode];
            
            const arrow = document.createElement('span');
            arrow.className = 'path-arrow';
            arrow.innerHTML = `&mdash; <b>${weight} min</b> &rarr;`;
            resultPath.appendChild(arrow);
        }
    });
}

// ===========================================================================
//  EVENT LISTENERS & APP INITIALIZATION
// ===========================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderMap();
    
    const algorithmSelect = document.getElementById('algorithm');
    const dijkstraStats = document.getElementById('dijkstraStats');
    const floydStats = document.getElementById('floydStats');
    
    algorithmSelect.addEventListener('change', (e) => {
        if (e.target.value === 'dijkstra') {
            dijkstraStats.classList.remove('hidden');
            floydStats.classList.add('hidden');
        } else {
            dijkstraStats.classList.add('hidden');
            floydStats.classList.remove('hidden');
        }
    });
    
    document.getElementById('findRouteBtn').addEventListener('click', () => {
        const algo = algorithmSelect.value;
        const start = document.getElementById('startNode').value;
        const end = document.getElementById('endNode').value;
        
        let path, time, execTime;
        
        if (algo === 'dijkstra') {
            const t0 = performance.now();
            const result = dijkstra(makati_map, start, end);
            const t1 = performance.now();
            
            path = result.path;
            time = result.total_time;
            execTime = t1 - t0;
        } else {
            const t0 = performance.now();
            // Pre-compute if not cached
            if (!floydCache) {
                floydCache = floyd_warshall(makati_map);
            }
            
            path = reconstruct_fw_path(floydCache.next_node, start, end);
            time = floydCache.dist[start][end];
            const t1 = performance.now();
            
            // If they query again, the retrieval is O(1). 
            // In a real scenario we might recompute to show time, but let's show the O(1) query time.
            execTime = t1 - t0; 
        }
        
        updateUI({ path, time, execTime });
        highlightPath(path);
    });
});
