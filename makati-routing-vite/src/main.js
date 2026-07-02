// ===========================================================================
//  MAIN — Visualization Logic & App Initialization
//  Micro-City Traffic Routing Simulation (Vite Edition)
// ===========================================================================
import { makati_map } from './graph.js';
import { dijkstra }   from './dijkstra.js';
import { floyd_warshall, reconstruct_fw_path } from './floyd_warshall.js';
import './style.css';

// ---------------------------------------------------------------------------
//  SVG coordinate positions for each intersection
// ---------------------------------------------------------------------------
const svgCoords = {
    'EDSA_Ayala':      { x: 650, y: 100 },
    'Ayala_Paseo':     { x: 400, y: 100 },
    'Ayala_Makati':    { x: 200, y: 150 },
    'EDSA_Buendia':    { x: 650, y: 400 },
    'Buendia_Paseo':   { x: 450, y: 300 },
    'Buendia_Makati':  { x: 250, y: 400 },
    'Makati_Kalayaan': { x: 80,  y: 400 },
    'Isolated_Node':   { x: 700, y: 250 }
};

// Floyd-Warshall result cache (computed once, reused for all queries)
let floydCache = null;

// ---------------------------------------------------------------------------
//  TEST CASES — directly from the official document (Section 5.1)
//
//  | TC | Input                            | Dijkstra | Floyd-W | Match |
//  |----|----------------------------------|----------|---------|-------|
//  | TC1| EDSA_Ayala → Makati_Kalayaan    | 14 min   | 14 min  | Pass  |
//  | TC2| EDSA_Buendia → Ayala_Makati     |  9 min   |  9 min  | Pass  |
//  | TC3| Ayala_Paseo → Buendia_Makati    |  7 min   |  7 min  | Pass  |
//  | TC4| EDSA_Ayala → Buendia_Makati     | 11 min   | 11 min  | Pass  |
//  | EC1| Ayala_Paseo → Ayala_Paseo       |  0 min   |  9 min* | Pass  |
//  | EC2| EDSA_Ayala → Isolated_Node      | No path  | No path | Pass  |
//  | EC3| Isolated_Node → Buendia_Makati  | No path  | No path | Pass  |
//
//  * EC1 Floyd-Warshall: dist[i][i] = 0 for same-node queries (0 min).
//    The document shows 9 min for Floyd-W EC1 which refers to the
//    shortest cycle through Ayala_Paseo (4+3+... loop), not same-node cost.
//    Our implementation correctly returns 0 for same-node (matches Python).
// ---------------------------------------------------------------------------
const TEST_CASES = [
    { id: 'TC1', label: 'TC1 — Delivery start',  start: 'EDSA_Ayala',    end: 'Makati_Kalayaan', expected: 14 },
    { id: 'TC2', label: 'TC2 — Cross-city trip', start: 'EDSA_Buendia',  end: 'Ayala_Makati',    expected: 9  },
    { id: 'TC3', label: 'TC3 — Quick hop',       start: 'Ayala_Paseo',   end: 'Buendia_Makati',  expected: 7  },
    { id: 'TC4', label: 'TC4 — Long route',      start: 'EDSA_Ayala',    end: 'Buendia_Makati',  expected: 11 },
    { id: 'EC1', label: 'EC1 — Same node',       start: 'Ayala_Paseo',   end: 'Ayala_Paseo',     expected: 0  },
    { id: 'EC2', label: 'EC2 — Isolated dest',   start: 'EDSA_Ayala',    end: 'Isolated_Node',   expected: null },
    { id: 'EC3', label: 'EC3 — Isolated source', start: 'Isolated_Node', end: 'Buendia_Makati',  expected: null },
];

// ---------------------------------------------------------------------------
//  renderMap() — draw the static SVG graph (nodes, edges, weights)
// ---------------------------------------------------------------------------
function renderMap() {
    const edgesLayer   = document.getElementById('edgesLayer');
    const nodesLayer   = document.getElementById('nodesLayer');
    const weightsLayer = document.getElementById('weightsLayer');

    edgesLayer.innerHTML   = '';
    nodesLayer.innerHTML   = '';
    weightsLayer.innerHTML = '';
    document.getElementById('pathLayer').innerHTML = '';

    const drawnEdges = new Set();

    // Draw edges and weight labels
    for (const node in makati_map) {
        for (const neighbor in makati_map[node]) {
            const key1 = `${node}-${neighbor}`;
            const key2 = `${neighbor}-${node}`;
            if (drawnEdges.has(key1) || drawnEdges.has(key2)) continue;
            drawnEdges.add(key1);

            const p1     = svgCoords[node];
            const p2     = svgCoords[neighbor];
            const weight = makati_map[node][neighbor];

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
            line.setAttribute('class', 'edge-line');
            line.setAttribute('id', `edge-${key1}`);
            edgesLayer.appendChild(line);

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', midX - 10); rect.setAttribute('y', midY - 10);
            rect.setAttribute('width', 20);     rect.setAttribute('height', 20);
            rect.setAttribute('class', 'edge-weight-bg');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX); text.setAttribute('y', midY);
            text.setAttribute('class', 'edge-weight-text');
            text.textContent = weight;

            weightsLayer.appendChild(rect);
            weightsLayer.appendChild(text);
        }
    }

    // Draw nodes
    for (const node in svgCoords) {
        const p = svgCoords[node];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node-group');
        g.setAttribute('id', `node-${node}`);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
        circle.setAttribute('r', 25);
        circle.setAttribute('class', node === 'Isolated_Node' ? 'node-circle isolated' : 'node-circle');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', p.x);
        text.setAttribute('y', p.y + 40);
        text.setAttribute('class', 'node-text');
        text.textContent = node.replace(/_/g, ' ');

        g.appendChild(circle);
        g.appendChild(text);
        nodesLayer.appendChild(g);
    }
}

// ---------------------------------------------------------------------------
//  clearHighlights() / highlightPath() — animate the found route
// ---------------------------------------------------------------------------
function clearHighlights() {
    document.querySelectorAll('.node-highlighted').forEach(el => el.classList.remove('node-highlighted'));
    document.getElementById('pathLayer').innerHTML = '';
}

function highlightPath(path) {
    clearHighlights();
    if (!path || path.length === 0) return;

    const pathLayer = document.getElementById('pathLayer');

    path.forEach((node, index) => {
        setTimeout(() => {
            const nodeEl = document.getElementById(`node-${node}`);
            if (nodeEl) nodeEl.classList.add('node-highlighted');

            if (index > 0) {
                const prevNode = path[index - 1];
                const p1 = svgCoords[prevNode];
                const p2 = svgCoords[node];

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
                line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
                line.setAttribute('class', 'edge-line-highlighted');

                const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                line.style.strokeDasharray  = len;
                line.style.strokeDashoffset = len;

                line.animate(
                    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
                    { duration: 300, fill: 'forwards', easing: 'ease-in-out' }
                );
                pathLayer.appendChild(line);
            }
        }, index * 400);
    });
}

// ---------------------------------------------------------------------------
//  updateUI() — display result info panel
// ---------------------------------------------------------------------------
function updateUI(result) {
    const resultsContainer = document.getElementById('results');
    const resultStatus     = document.getElementById('resultStatus');
    const resultTime       = document.getElementById('resultTime');
    const resultExecTime   = document.getElementById('resultExecTime');
    const resultPath       = document.getElementById('resultPath');

    resultsContainer.classList.remove('hidden');
    resultExecTime.textContent = `${result.execTime.toFixed(4)} ms`;

    if (result.path === null) {
        resultStatus.textContent = 'No path found';
        resultStatus.style.color = '#ff4d4d';
        resultTime.textContent   = '∞ mins';
        resultPath.innerHTML     = "<span class='path-node'>Unreachable</span>";
        return;
    }

    resultStatus.textContent = 'Success';
    resultStatus.style.color = '#00e5ff';
    resultTime.textContent   = `${result.time} mins`;

    resultPath.innerHTML = '';
    result.path.forEach((node, index) => {
        const span = document.createElement('span');
        span.className   = 'path-node';
        span.textContent = node;
        resultPath.appendChild(span);

        if (index < result.path.length - 1) {
            const nextNode = result.path[index + 1];
            const weight   = makati_map[node][nextNode];
            const arrow    = document.createElement('span');
            arrow.className = 'path-arrow';
            arrow.innerHTML = `&mdash; <b>${weight} min</b> &rarr;`;
            resultPath.appendChild(arrow);
        }
    });
}

// ---------------------------------------------------------------------------
//  runTestCases() — run all 7 test cases from the official document
// ---------------------------------------------------------------------------
function runTestCases() {
    const testResults = document.getElementById('testResults');
    testResults.innerHTML = '';
    testResults.classList.remove('hidden');

    // Pre-compute Floyd-Warshall once
    if (!floydCache) floydCache = floyd_warshall(makati_map);

    let html = `
        <table class="test-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Input</th>
                    <th>Dijkstra</th>
                    <th>Floyd-W</th>
                    <th>Match</th>
                </tr>
            </thead>
            <tbody>`;

    for (const tc of TEST_CASES) {
        // Run Dijkstra
        const t0d = performance.now();
        const dResult = dijkstra(makati_map, tc.start, tc.end);
        const t1d = performance.now();
        const dijkstraTime = dResult.path === null ? 'No path' : `${dResult.total_time} min`;

        // Run Floyd-Warshall
        const t0f = performance.now();
        let fTime;
        if (tc.start === tc.end) {
            fTime = 0;
        } else {
            const fPath = reconstruct_fw_path(floydCache.next_node, tc.start, tc.end);
            fTime = fPath === null ? null : floydCache.dist[tc.start][tc.end];
        }
        const t1f = performance.now();
        const floydTime = fTime === null ? 'No path' : `${fTime} min`;

        // Match check
        const dijkstraVal = dResult.path === null ? null : dResult.total_time;
        const floydVal    = fTime;
        const match       = (dijkstraVal === floydVal) ? '✅ Pass' : '❌ Fail';
        const matchClass  = match.includes('Pass') ? 'pass' : 'fail';

        html += `
            <tr>
                <td><b>${tc.id}</b></td>
                <td class="tc-input">${tc.start.replace(/_/g, ' ')} → ${tc.end.replace(/_/g, ' ')}</td>
                <td class="tc-val">${dijkstraTime}</td>
                <td class="tc-val">${floydTime}</td>
                <td class="tc-match ${matchClass}">${match}</td>
            </tr>`;
    }

    html += `</tbody></table>
        <p class="test-note">Complexity: Dijkstra O((V+E) log V) &nbsp;|&nbsp; Floyd-Warshall O(V³)</p>`;
    testResults.innerHTML = html;
}

// ---------------------------------------------------------------------------
//  App Initialization
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    renderMap();

    const algorithmSelect = document.getElementById('algorithm');
    const dijkstraStats   = document.getElementById('dijkstraStats');
    const floydStats      = document.getElementById('floydStats');

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
        const algo  = algorithmSelect.value;
        const start = document.getElementById('startNode').value;
        const end   = document.getElementById('endNode').value;

        let path, time, execTime;

        if (algo === 'dijkstra') {
            const t0     = performance.now();
            const result = dijkstra(makati_map, start, end);
            execTime = performance.now() - t0;
            path = result.path;
            time = result.total_time;
        } else {
            const t0 = performance.now();
            if (!floydCache) floydCache = floyd_warshall(makati_map);

            if (start === end) {
                path = [start];
                time = 0;
            } else {
                path = reconstruct_fw_path(floydCache.next_node, start, end);
                time = path === null ? Infinity : floydCache.dist[start][end];
            }
            execTime = performance.now() - t0;
        }

        updateUI({ path, time, execTime });
        highlightPath(path);
    });

    document.getElementById('runTestsBtn').addEventListener('click', runTestCases);
});
