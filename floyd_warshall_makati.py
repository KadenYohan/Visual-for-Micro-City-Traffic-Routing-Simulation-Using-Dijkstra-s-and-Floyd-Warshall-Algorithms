"""
=============================================================================
  MICRO-CITY TRAFFIC ROUTING SIMULATION — Floyd-Warshall Implementation
=============================================================================
  Project Role : Floyd-Warshall Implementation Lead
  Algorithm    : Floyd-Warshall (All-Pairs Shortest Path)
  Paradigm     : Dynamic Programming (DP)
  City Map     : Makati CBD, Metro Manila (7 intersections + 1 isolated node)
  Complexity   : Time  → O(V³)  |  Space → O(V²)

  WHY IS THIS DYNAMIC PROGRAMMING?
  ---------------------------------
  DP is a technique where we break a problem into overlapping sub-problems,
  solve each sub-problem once, and store the result so it can be reused.

  Floyd-Warshall fits this definition perfectly:
    • Sub-problem  : "What is the shortest path from i to j using only
                      intermediate nodes drawn from the set {0, 1, …, k}?"
    • Reuse        : The answer for set {0..k} is BUILT ON TOP of the already-
                      computed answer for set {0..k-1}.  We never recompute
                      from scratch — we simply ask:
                        "Is the detour through k cheaper than what we already know?"
    • Optimal sub-structure: If the shortest i→j path passes through k,
                      then the i→k segment and k→j segment must themselves
                      be shortest paths (classic DP property).

  WHY DOES IT COMPUTE ALL PAIRS, NOT JUST ONE ROUTE?
  ----------------------------------------------------
  Unlike Dijkstra's algorithm (greedy, single-source), Floyd-Warshall
  fills in a full V×V distance matrix — every possible (source, destination)
  combination — in a single run. This makes it ideal when you need to answer
  many routing queries on the same map without re-running the algorithm each
  time. The trade-off is O(V²) space and O(V³) time, which is acceptable for
  small city graphs like ours (V = 8).

  HOW DOES THE 'next_node' TABLE REBUILD THE ACTUAL PATH?
  --------------------------------------------------------
  The dist table only stores *costs*. To recover the actual sequence of
  intersections, we maintain a parallel 'next_node[i][j]' table:
    • Initially, next_node[i][j] = j  (the direct neighbour to step towards)
    • Whenever we find a shorter path i→k→j, we update:
          next_node[i][j] = next_node[i][k]
      This means "to go from i toward j, take the same first step you would
      take to go from i toward k."
  To reconstruct a full path, we simply follow the chain:
      start → next_node[start][end] → next_node[...][end] → … → end
=============================================================================
"""

import time   # for perf_counter() — high-resolution wall-clock timer
import math   # for math.inf — represents "no connection / infinite distance"


# ---------------------------------------------------------------------------
#  GRAPH DEFINITION — Makati CBD Micro-City Map
# ---------------------------------------------------------------------------
# Nodes   : major road intersections in the Makati CBD area
# Edges   : roads connecting intersections (bidirectional)
# Weights : estimated travel time in MINUTES between intersections
#
# 'Isolated_Node' is intentionally added with NO neighbours to test the
# edge case where a destination has no connecting roads.

makati_map = {
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
    # ── EDGE CASE: an intersection with zero connecting roads ──
    # Floyd-Warshall should handle this gracefully (no crash),
    # returning "No path found" for any query involving this node.
    'Isolated_Node': {}
}


# ===========================================================================
#  CORE ALGORITHM 1 — floyd_warshall()
# ===========================================================================

def floyd_warshall(graph: dict) -> tuple[dict, dict]:
    """
    Runs the Floyd-Warshall All-Pairs Shortest Path algorithm.

    DP Approach
    -----------
    We iterate over every node k as a *potential intermediate stop*.
    For every ordered pair (i, j), we check whether routing THROUGH k
    gives a shorter trip than the best known direct-ish route.

        dist[i][j] = min( dist[i][j],  dist[i][k] + dist[k][j] )

    Because k grows from 0 to V-1, by the time we finish the outer loop,
    dist[i][j] holds the true shortest path cost considering ALL possible
    intermediate nodes — not just k, but every node we've already processed.
    Each iteration *builds on* the previous one: that is the essence of DP.

    Parameters
    ----------
    graph : dict
        Adjacency dictionary  { node: { neighbour: weight, … }, … }

    Returns
    -------
    dist      : dict[node][node] → shortest travel time (float/int or math.inf)
    next_node : dict[node][node] → first step on the optimal path from i to j
                                   (None if no path exists)
    """

    nodes = list(graph.keys())   # ordered list of all intersection names
    V = len(nodes)               # total number of nodes (vertices)

    # ------------------------------------------------------------------
    # STEP 1 — Initialise the distance and path-reconstruction tables
    # ------------------------------------------------------------------
    # dist[i][j] starts as:
    #   • 0          if i == j  (you're already there — zero cost)
    #   • w          if a direct road (i→j) exists with weight w
    #   • math.inf   otherwise  (no known connection yet)
    #
    # next_node[i][j] starts as:
    #   • None       if no direct road exists (can't step anywhere)
    #   • j          if a direct road exists  (step straight to j)

    dist      = {i: {j: math.inf for j in nodes} for i in nodes}
    next_node = {i: {j: None     for j in nodes} for i in nodes}

    # Every node has zero cost to reach itself
    for node in nodes:
        dist[node][node] = 0
        # next_node[node][node] stays None — we're already at the destination

    # Seed the distance matrix with the direct edge weights from the graph
    for u in graph:
        for v, weight in graph[u].items():
            dist[u][v]      = weight
            next_node[u][v] = v   # the very next step from u toward v is v itself

    # ------------------------------------------------------------------
    # STEP 2 — Triple-nested DP loop  (the heart of Floyd-Warshall)
    # ------------------------------------------------------------------
    # Outer  loop k : intermediate "relay" node we're currently considering
    # Middle loop i : source node of each pair
    # Inner  loop j : destination node of each pair
    #
    # Key insight: after processing intermediate node k, dist[i][j] is the
    # shortest path from i to j that is allowed to pass through any of the
    # nodes {nodes[0], …, k}.  By the end of the outer loop, all V nodes
    # have been tried as intermediates, so dist contains true global optima.

    for k in nodes:          # try every node as a potential pit-stop
        for i in nodes:      # consider every possible starting intersection
            for j in nodes:  # consider every possible ending intersection

                # Skip pairs where either leg is completely unreachable —
                # adding infinity to anything is still infinity, no update needed.
                if dist[i][k] == math.inf or dist[k][j] == math.inf:
                    continue

                # The "relaxation" step — can we do better by going through k?
                path_through_k = dist[i][k] + dist[k][j]

                if path_through_k < dist[i][j]:
                    # Found a shorter route!  Update both tables.
                    dist[i][j] = path_through_k

                    # To go from i to j via k, the FIRST step is whatever
                    # the first step from i toward k is.
                    # We store that pointer so reconstruct_fw_path() can
                    # follow the chain later without recomputing anything.
                    next_node[i][j] = next_node[i][k]

    return dist, next_node


# ===========================================================================
#  CORE ALGORITHM 2 — reconstruct_fw_path()
# ===========================================================================

def reconstruct_fw_path(next_node: dict, start: str, end: str) -> list | None:
    """
    Traces the actual sequence of intersections from 'start' to 'end'
    using the 'next_node' pointer table built by floyd_warshall().

    How path reconstruction works
    ------------------------------
    After floyd_warshall() finishes, next_node[i][j] always holds the
    FIRST intersection to visit when leaving i on the way to j.
    By repeatedly following that pointer, we hop through intermediate
    intersections until we arrive at the destination:

        path = [start]
        current = start
        while current != end:
            current = next_node[current][end]   ← one hop forward
            path.append(current)

    This is O(V) per query — very cheap because all the heavy lifting
    (finding the shortest distances) was already done by the DP.

    Parameters
    ----------
    next_node : dict   — pointer table from floyd_warshall()
    start     : str    — name of the source intersection
    end       : str    — name of the destination intersection

    Returns
    -------
    list of intersection names (including start and end), or
    None if no path exists (next_node[start][end] is None).
    """

    # If the pointer is None at the very first step, there is no route
    if next_node[start][end] is None:
        return None

    path    = [start]   # the route we're building up, beginning at start
    current = start     # our current position as we hop through the map

    # Follow the chain of "next step" pointers until we reach the destination
    while current != end:
        current = next_node[current][end]   # advance one intersection
        path.append(current)                 # record this intersection
        # Safety guard: if we somehow loop (shouldn't happen with correct FW),
        # bail out to avoid an infinite loop.
        if len(path) > len(next_node) + 1:
            return None  # something went wrong — graph is malformed

    return path


# ===========================================================================
#  HELPER — pretty-print a single routing result
# ===========================================================================

def print_route_result(label: str, start: str, end: str,
                       dist: dict, next_node: dict) -> None:
    """
    Formats and prints the result for one (start → end) query.

    Parameters
    ----------
    label     : str  — a short description of this test case
    start     : str  — source intersection name
    end       : str  — destination intersection name
    dist      : dict — distance table from floyd_warshall()
    next_node : dict — pointer table from floyd_warshall()
    """
    separator = "-" * 60

    print(f"\n{separator}")
    print(f"  TEST: {label}")
    print(f"  From : {start}")
    print(f"  To   : {end}")
    print(separator)

    # ── Edge Case A: start and destination are the same node ──
    if start == end:
        print("  ⚠  Start and destination are the SAME intersection.")
        print(f"  ✔  Travel time : 0 minutes  (no movement needed)")
        print(f"  ✔  Route       : [{start}]")
        return

    # ── Edge Case B (or any disconnected pair): no path exists ──
    if dist[start][end] == math.inf:
        print("  ✘  No path found.")
        print("     This intersection may be isolated (no connecting roads).")
        print("     Floyd-Warshall handled this gracefully — no crash.")
        return

    # ── Normal case: reconstruct and display the optimal path ──
    path = reconstruct_fw_path(next_node, start, end)

    if path is None:
        # reconstruct_fw_path returned None even though dist was finite —
        # this would indicate a table inconsistency (shouldn't occur).
        print("  ✘  Path reconstruction failed (unexpected inconsistency).")
        return

    # Format the path as a readable sequence with arrows
    route_str = "  →  ".join(path)
    print(f"  ✔  Optimal Route : {route_str}")
    print(f"  ✔  Total Travel Time : {dist[start][end]} minutes")


# ===========================================================================
#  HELPER — run and display all test cases (standard routes + edge cases)
# ===========================================================================

def run_all_tests(dist: dict, next_node: dict, elapsed_ms: float) -> None:
    """Runs every pre-defined test case. Called when the user types 'test'."""

    standard_tests = [
        # label,                          start,             end
        ("Route 1 – Delivery start",  "EDSA_Ayala",       "Makati_Kalayaan"),
        ("Route 2 – Cross-city trip", "EDSA_Buendia",     "Ayala_Makati"),
        ("Route 3 – Quick hop",       "Ayala_Paseo",      "Buendia_Makati"),
        ("Route 4 – Long route",      "EDSA_Ayala",       "Buendia_Makati"),
    ]

    print("\n" + "=" * 65)
    print("   STANDARD ROUTE RESULTS  (compare with Dijkstra for sanity check)")
    print("=" * 65)
    for label, start, end in standard_tests:
        print_route_result(label, start, end, dist, next_node)

    print("\n" + "=" * 65)
    print("   EDGE CASE TESTS")
    print("=" * 65)

    # Edge Case 1 — start == end
    print_route_result(
        "Edge Case 1 – Start == End",
        "Ayala_Paseo", "Ayala_Paseo",
        dist, next_node
    )
    # Edge Case 2 — destination is isolated (no roads)
    print_route_result(
        "Edge Case 2 – Disconnected / Isolated node",
        "EDSA_Ayala", "Isolated_Node",
        dist, next_node
    )
    # Edge Case 2b — source is isolated
    print_route_result(
        "Edge Case 2b – Routing FROM isolated node",
        "Isolated_Node", "Buendia_Makati",
        dist, next_node
    )

    # ------------------------------------------------------------------
    # ALL-PAIRS DISTANCE TABLE
    # ------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("   ALL-PAIRS SHORTEST DISTANCE TABLE  (minutes)")
    print("   (This is what makes Floyd-Warshall unique — every pair,")
    print("    computed once, reused for any future query in O(1) time)")
    print("=" * 65)

    nodes = list(makati_map.keys())
    short = {
        'EDSA_Ayala'      : 'EDSA_A',
        'Ayala_Paseo'     : 'Ayal_P',
        'Ayala_Makati'    : 'Ayal_M',
        'Buendia_Makati'  : 'Buen_M',
        'Buendia_Paseo'   : 'Buen_P',
        'EDSA_Buendia'    : 'EDSA_B',
        'Makati_Kalayaan' : 'Kal.',
        'Isolated_Node'   : 'ISO',
    }

    col_w  = 8
    header = f"{'':15}" + "".join(f"{short[n]:>{col_w}}" for n in nodes)
    print(f"\n{header}")
    print("-" * len(header))
    for i in nodes:
        row = f"{short[i]:<15}"
        for j in nodes:
            val  = dist[i][j]
            cell = "∞" if val == math.inf else str(val)
            row += f"{cell:>{col_w}}"
        print(row)

    # ------------------------------------------------------------------
    # COMPLEXITY SUMMARY
    # ------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("   COMPLEXITY ANALYSIS SUMMARY")
    print("=" * 65)
    print(f"   Nodes (V)          : {len(makati_map)}")
    print(f"   Time  Complexity   : O(V³)  =  O({len(makati_map)}³) = "
          f"{len(makati_map)**3} operations")
    print(f"   Space Complexity   : O(V²)  =  O({len(makati_map)}²) = "
          f"{len(makati_map)**2} table cells (dist + next_node)")
    print(f"   Algorithm Type     : Dynamic Programming (All-Pairs)")
    print(f"   Compare to Dijkstra: Greedy, Single-Source, O((V+E) log V)")
    print(f"\n   Execution time     : {elapsed_ms:.4f} ms")
    print("=" * 65)


# ===========================================================================
#  MAIN — interactive routing query loop
# ===========================================================================

def main():
    print("=" * 65)
    print("   MICRO-CITY TRAFFIC ROUTING SIMULATION")
    print("   Algorithm : Floyd-Warshall (Dynamic Programming)")
    print("   City Map  : Makati CBD, Metro Manila")
    print("=" * 65)

    # ------------------------------------------------------------------
    # Run Floyd-Warshall once — results are reused for every query
    # ------------------------------------------------------------------
    print("\n⏱  Running Floyd-Warshall algorithm...")
    t_start    = time.perf_counter()
    dist, next_node = floyd_warshall(makati_map)
    t_end      = time.perf_counter()
    elapsed_ms = (t_end - t_start) * 1000   # seconds → milliseconds

    print(f"   Execution time : {elapsed_ms:.4f} ms")
    print(f"   (Computed shortest paths between ALL {len(makati_map)} node pairs)")

    # ------------------------------------------------------------------
    # Show the list of valid intersection names the user can type
    # ------------------------------------------------------------------
    valid_nodes = [n for n in makati_map.keys() if n != 'Isolated_Node']

    print("\n" + "=" * 65)
    print("   VALID INTERSECTIONS YOU CAN USE")
    print("=" * 65)
    for i, name in enumerate(valid_nodes, 1):
        print(f"   {i}. {name}")
    print(f"   8. Isolated_Node  ⚠  (no roads — use to demo edge case)")
    print("=" * 65)
    print("\n   Commands:")
    print("   • Type  'test'          → run all pre-defined test cases")
    print("   • Type  'quit'          → exit the simulation")
    print("   • Type an intersection  → enter FROM / TO to find a route")
    print("   Tip: type 'Isolated_Node' as FROM or TO to see the edge case.")

    # ------------------------------------------------------------------
    # Interactive query loop
    # ------------------------------------------------------------------
    while True:
        print("\n" + "-" * 65)
        user_input = input("  Enter command or FROM intersection: ").strip()

        # ── Exit ──────────────────────────────────────────────────────
        if user_input.lower() == 'quit':
            print("\n  Exiting simulation. Goodbye!\n")
            break

        # ── Run all test cases ────────────────────────────────────────
        if user_input.lower() == 'test':
            run_all_tests(dist, next_node, elapsed_ms)
            continue

        # ── Custom route query ────────────────────────────────────────
        start = user_input

        # Validate the FROM node (case-insensitive match)
        all_nodes     = list(makati_map.keys())
        node_map      = {n.lower(): n for n in all_nodes}   # lookup by lowercase
        start_matched = node_map.get(start.lower())

        if start_matched is None:
            print(f"\n  ✘  '{start}' is not a recognised intersection.")
            print("     Please use one of the names listed above.")
            continue

        # Warn the user if they chose the isolated node as FROM
        if start_matched == 'Isolated_Node':
            print("\n  ⚠  'Isolated_Node' has no roads — it cannot reach anywhere.")
            print("     (Demonstrating edge case: Floyd-Warshall handles this gracefully.)")

        end_input   = input("  Enter TO intersection            : ").strip()
        end_matched = node_map.get(end_input.lower())

        if end_matched is None:
            print(f"\n  ✘  '{end_input}' is not a recognised intersection.")
            print("     Please use one of the names listed above.")
            continue

        # Warn the user if they chose the isolated node as TO
        if end_matched == 'Isolated_Node':
            print("\n  ⚠  'Isolated_Node' has no roads — nothing can reach it.")
            print("     (Demonstrating edge case: Floyd-Warshall handles this gracefully.)")

        # Print the result for the chosen pair
        print_route_result(
            "Custom Query",
            start_matched,
            end_matched,
            dist, next_node
        )


# ---------------------------------------------------------------------------
#  Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    main()
