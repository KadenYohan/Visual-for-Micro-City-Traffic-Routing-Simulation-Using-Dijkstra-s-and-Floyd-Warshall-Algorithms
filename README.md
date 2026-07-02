# Micro-City Traffic Routing Simulation

> Visual comparison of **Dijkstra's Algorithm** (Greedy) and **Floyd-Warshall** (Dynamic Programming) on a Makati CBD micro-city road network.

![Algorithm](https://img.shields.io/badge/Algorithms-Dijkstra%20%7C%20Floyd--Warshall-00e5ff?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-Vite%20%2B%20Vanilla%20JS-646cff?style=flat-square)

---

## 📁 Project Structure

```
Algo/
├── makati-routing-vite/        ← 🌐 Web visualization (Vite)
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.js             ← App entry point & visualization
│       ├── graph.js            ← Makati CBD graph definition
│       ├── dijkstra.js         ← Dijkstra's algorithm (Greedy)
│       ├── floyd_warshall.js   ← Floyd-Warshall algorithm (DP)
│       └── style.css           ← UI styles
│
├── dijkstra.py                 ← Python CLI: Dijkstra
├── floyd_warshall_makati.py    ← Python CLI: Floyd-Warshall
├── documentation_dijkstra.txt  ← Dijkstra documentation
├── floyd_documentation.txt     ← Floyd-Warshall documentation
├── Algorithms_Design_Project.docx
└── Dijkstra_Explained.docx
```

---

## 🚀 How to Run the Web Visualization

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher (`node --version` to check)
- npm (comes bundled with Node.js)

### Steps

```bash
# 1. Navigate to the Vite project folder
cd makati-routing-vite

# 2. Install dependencies (only needed once)
npm install

# 3. Start the development server
npm run dev
```

Then open your browser at **http://localhost:5173**

> **For teammates pulling from GitHub:** Run `npm install` before `npm run dev` every time you pull, in case dependencies changed.

---

## 🐍 How to Run the Python Scripts

### Prerequisites
- Python 3.10 or higher

### Dijkstra
```bash
python dijkstra.py
```
- Type `test` to run all 7 official test cases
- Type an intersection name (e.g. `EDSA_Ayala`) to find a custom route
- Type `quit` to exit

### Floyd-Warshall
```bash
python floyd_warshall_makati.py
```
- Type `test` to run all test cases + print the full all-pairs distance table
- Type an intersection name to query a route
- Type `quit` to exit

---

## 🗺️ Graph: Makati CBD Micro-City Map

| Node | Description |
|------|-------------|
| `EDSA_Ayala` | EDSA / Ayala Ave intersection |
| `Ayala_Paseo` | Ayala Ave / Paseo de Roxas |
| `Ayala_Makati` | Ayala Ave / Makati Ave |
| `Buendia_Makati` | Sen. Gil Puyat / Makati Ave |
| `Buendia_Paseo` | Sen. Gil Puyat / Paseo de Roxas |
| `EDSA_Buendia` | EDSA / Sen. Gil Puyat |
| `Makati_Kalayaan` | Makati Ave / Kalayaan |
| `Isolated_Node` | ⚠️ No roads — edge case demo |

---

## ✅ Test Cases (from Official Document, Section 5.1)

| ID  | Input | Dijkstra | Floyd-W | Match |
|-----|-------|----------|---------|-------|
| TC1 | EDSA_Ayala → Makati_Kalayaan | 14 min | 14 min | ✅ Pass |
| TC2 | EDSA_Buendia → Ayala_Makati  | 9 min  | 9 min  | ✅ Pass |
| TC3 | Ayala_Paseo → Buendia_Makati | 7 min  | 7 min  | ✅ Pass |
| TC4 | EDSA_Ayala → Buendia_Makati  | 11 min | 11 min | ✅ Pass |
| EC1 | Ayala_Paseo → Ayala_Paseo    | 0 min  | 0 min  | ✅ Pass |
| EC2 | EDSA_Ayala → Isolated_Node   | No path| No path| ✅ Pass |
| EC3 | Isolated_Node → Buendia_Makati | No path | No path | ✅ Pass |

---

## 📊 Complexity Analysis

|       | Dijkstra       | Floyd-Warshall |
|-------|----------------|----------------|
| Time  | O((V+E) log V) | O(V³)          |
| Space | O(V+E)         | O(V²)          |

---

## 🔧 Build for Production

```bash
cd makati-routing-vite
npm run build
```
The output will be in `makati-routing-vite/dist/`.

---

## 👥 Team

| Role | Algorithm |
|------|-----------|
| Member (Dijkstra Lead) | Dijkstra's Algorithm (Greedy) |
| Member (Floyd-Warshall Lead) | Floyd-Warshall (Dynamic Programming) |