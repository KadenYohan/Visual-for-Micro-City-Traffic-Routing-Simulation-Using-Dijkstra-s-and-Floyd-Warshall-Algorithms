"""
=============================================================================
  MICRO-CITY TRAFFIC ROUTING SIMULATION — Dijkstra Implementation
=============================================================================
  Project Role : Dijkstra Implementation Lead
  Algorithm    : Dijkstra's Algorithm (Single-Source Shortest Path)
  Paradigm     : Greedy
  City Map     : Makati CBD, Metro Manila (7 intersections + 1 isolated node)
  Complexity   : Time  → O((V+E) log V)  |  Space → O(V+E)

  WHY IS THIS A GREEDY ALGORITHM?
  ---------------------------------
  A greedy algorithm builds a solution step by step, always making the
  choice that looks best RIGHT NOW, and never revisiting that choice later.

  Dijkstra fits this definition perfectly:
    • At every step, it commits to the closest unvisited intersection —
      the one with the smallest known distance from the start.
    • Once an intersection is "settled" (popped off the priority queue),
      its shortest distance is locked in forever. The algorithm never goes
      back to re-check whether an earlier decision could have been better.
    • This greedy choice is provably safe here (unlike many greedy
      algorithms) because every road weight is positive — there is no way
      a longer detour could ever turn out cheaper later on.

  WHY A PRIORITY QUEUE (HEAP)?
  ------------------------------
  At every step we need to know which unvisited intersection is currently
  cheapest to reach. A plain list would force us to scan every entry to
  find the minimum (O(n) per lookup). A min-heap keeps the smallest item
  at the top at all times, so grabbing it costs O(log n) instead. Each
  time we discover a cheaper way to reach a node, we simply push a new
  (distance, node) pair onto the heap rather than mutating an existing
  entry — the heap naturally floats the cheapest entry to the top
  regardless of how many stale duplicates are still sitting underneath it.

  WHY CAN IT STOP EARLY ONCE THE DESTINATION IS REACHED?
  ----------------------------------------------------------
  Because the algorithm always expands the closest unvisited node first,
  the FIRST time the destination is popped off the heap, that distance is
  guaranteed to be the shortest possible one. Nothing still sitting in the
  queue can offer a cheaper route to it — everything left is at least as
  expensive as what we just popped. So we break immediately instead of
  wasting time exploring the rest of the map.

  SINGLE-SOURCE VS. ALL-PAIRS (compare with Member 3's Floyd-Warshall)
  ----------------------------------------------------------------------
  Dijkstra answers ONE question per run: "what's the shortest path from
  THIS start node to THIS destination?" Asking about a different start
  means re-running the whole algorithm from scratch. Floyd-Warshall instead
  computes every possible (start, destination) pair in a single pass, then
  answers any future query instantly. That trade-off — fast per-query setup
  vs. one expensive upfront pass — is the "interesting insight" called out
  in the project proposal.
=============================================================================
"""

import heapq  # for the min-heap priority queue
import time   # for perf_counter() — high-resolution wall-clock timer
import math   # for math.inf — represents "no connection / infinite distance"


# ---------------------------------------------------------------------------
#  GRAPH DEFINITION — Makati CBD Micro-City Map
# ---------------------------------------------------------------------------
# Nodes   : major road intersections in the Makati CBD area
# Edges   : roads connecting intersections (bidirectional)
# Weights : estimated travel time in MINUTES between intersections
#
# 'Isolated_Node' has NO neighbours. It mirrors the exact graph used in
# Member 3's Floyd-Warshall script so both algorithms run against the same
# map and can be cross-validated on identical test cases. Disconnected-node
# testing is primarily Member 3's required edge case, but Dijkstra should
# fail gracefully on it too instead of crashing.

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
    # Dijkstra should handle this gracefully (no crash),
    # returning "No path found" for any query involving this node.
    'Isolated_Node': {}
}


# ===========================================================================
#  CORE ALGORITHM — dijkstra()
# ===========================================================================

def dijkstra(graph: dict, start: str, destination: str) -> tuple[list | None, float]:
    """
    Runs Dijkstra's Single-Source Shortest Path algorithm from 'start' to
    'destination', stopping as soon as the destination is settled, and
    hands back the actual route plus its total travel time.

    Greedy Approach
    ---------------
    We repeatedly pull the cheapest-to-reach unvisited intersection off a
    min-heap, lock in its distance as final, and use it to see if any of
    its neighbours can now be reached more cheaply than before:

        distances[neighbour] = min(distances[neighbour],
                                    distances[current] + weight(current, neighbour))

    Because we always settle the globally closest node next, once
    'destination' is popped we know no cheaper route to it remains
    unexplored — so we stop immediately instead of mapping the whole graph.
    We then walk backwards through the recorded "came from" pointers to
    rebuild the actual sequence of intersections, not just its cost.

    Parameters
    ----------
    graph       : dict — adjacency dictionary { node: { neighbour: weight, … }, … }
    start       : str  — name of the source intersection
    destination : str  — name of the target intersection

    Returns
    -------
    path       : list of intersection names from start to destination
                 (inclusive), or None if destination is unreachable.
    total_time : total travel time in minutes for that path
                 (math.inf if destination is unreachable).
    """

    # Edge case: start and destination are the same intersection —
    # there's nothing to search for, you're already there.
    if start == destination:
        return [start], 0

    # ------------------------------------------------------------------
    # STEP 1 — Initialise the distance table and the priority queue
    # ------------------------------------------------------------------
    # Every node starts "impossibly far away" except the start itself,
    # which costs 0 minutes to reach from itself.
    distances = {node: math.inf for node in graph}
    distances[start] = 0

    # previous_nodes lets us walk backwards from destination to start
    # afterwards, to rebuild the actual route (not just its total cost).
    previous_nodes = {}

    # Heap entries are (distance_so_far, node). heapq sorts tuples
    # lexicographically, so the cheapest node to reach is always on top.
    priority_queue = [(0, start)]
    visited = set()

    # ------------------------------------------------------------------
    # STEP 2 — Greedily settle the closest unvisited node, repeat
    # ------------------------------------------------------------------
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        # Early exit: the first time we pop the destination, its
        # distance is final — no need to keep exploring the rest.
        if current_node == destination:
            break

        # A node can sit on the heap multiple times (once per edge that
        # improved it). Skip it once its shortest distance is already
        # locked in, so we don't redo work.
        if current_node in visited:
            continue
        visited.add(current_node)

        # ------------------------------------------------------------------
        # STEP 3 — Relax every edge leaving the node we just settled
        # ------------------------------------------------------------------
        for neighbor, travel_time in graph[current_node].items():
            new_distance = current_distance + travel_time
            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(priority_queue, (new_distance, neighbor))

    # ------------------------------------------------------------------
    # STEP 4 — No route was ever found to the destination
    # ------------------------------------------------------------------
    if distances[destination] == math.inf:
        return None, math.inf

    # ------------------------------------------------------------------
    # STEP 5 — Rebuild the actual route by walking previous_nodes backwards
    # ------------------------------------------------------------------
    path = [destination]
    current = destination
    while current != start:
        current = previous_nodes[current]
        path.append(current)
    path.reverse()

    return path, distances[destination]


# ===========================================================================
#  HELPER — pretty-print a single routing result
# ===========================================================================

def print_route_result(label: str, start: str, end: str,
                        path: list | None, total_time: float) -> None:
    """
    Formats and prints the result for one (start → end) query.

    Parameters
    ----------
    label      : str        — a short description of this test case
    start      : str        — source intersection name
    end        : str        — destination intersection name
    path       : list|None  — route returned by dijkstra(), or None if unreachable
    total_time : float      — total travel time returned by dijkstra()
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
    if path is None:
        print("  ✘  No path found.")
        print("     This intersection may be isolated (no connecting roads).")
        print("     Dijkstra handled this gracefully — no crash.")
        return

    # ── Normal case: display the optimal path already built by dijkstra() ──
    route_str = "  →  ".join(path)
    print(f"  ✔  Optimal Route : {route_str}")
    print(f"  ✔  Total Travel Time : {total_time} minutes")


# ===========================================================================
#  HELPER — run and display all test cases (standard routes + edge cases)
# ===========================================================================

def run_all_tests() -> None:
    """Runs every pre-defined test case. Called when the user types 'test'."""

    # Same routes used in Member 3's Floyd-Warshall test suite, so results
    # can be directly cross-validated between both algorithms.
    standard_tests = [
        # label,                          start,             end
        ("Route 1 – Delivery start",  "EDSA_Ayala",       "Makati_Kalayaan"),
        ("Route 2 – Cross-city trip", "EDSA_Buendia",     "Ayala_Makati"),
        ("Route 3 – Quick hop",       "Ayala_Paseo",      "Buendia_Makati"),
        ("Route 4 – Long route",      "EDSA_Ayala",       "Buendia_Makati"),
    ]

    print("\n" + "=" * 65)
    print("   STANDARD ROUTE RESULTS  (compare with Floyd-Warshall for sanity check)")
    print("=" * 65)

    total_elapsed_ms = 0.0
    for label, start, end in standard_tests:
        t_start = time.perf_counter()
        path, total_time = dijkstra(makati_map, start, end)
        t_end = time.perf_counter()
        elapsed_ms = (t_end - t_start) * 1000
        total_elapsed_ms += elapsed_ms

        print_route_result(label, start, end, path, total_time)
        print(f"  ⏱  Execution time : {elapsed_ms:.4f} ms  (this run re-computed from scratch)")

    print("\n" + "=" * 65)
    print("   EDGE CASE TESTS")
    print("=" * 65)

    # Edge Case 1 — start == end
    path1, time1 = dijkstra(makati_map, "Ayala_Paseo", "Ayala_Paseo")
    print_route_result("Edge Case 1 – Start == End", "Ayala_Paseo", "Ayala_Paseo", path1, time1)

    # Edge Case 2 — destination is isolated (no roads)
    path2, time2 = dijkstra(makati_map, "EDSA_Ayala", "Isolated_Node")
    print_route_result("Edge Case 2 – Disconnected / Isolated node", "EDSA_Ayala", "Isolated_Node", path2, time2)

    # Edge Case 2b — source is isolated
    path3, time3 = dijkstra(makati_map, "Isolated_Node", "Buendia_Makati")
    print_route_result("Edge Case 2b – Routing FROM isolated node", "Isolated_Node", "Buendia_Makati", path3, time3)

    # ------------------------------------------------------------------
    # COMPLEXITY SUMMARY
    # ------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("   COMPLEXITY ANALYSIS SUMMARY")
    print("=" * 65)
    V = len(makati_map)
    E = sum(len(neighbors) for neighbors in makati_map.values()) // 2  # undirected, each edge counted twice
    print(f"   Nodes (V)          : {V}")
    print(f"   Edges (E)          : {E}")
    print(f"   Time  Complexity   : O((V+E) log V)")
    print(f"   Space Complexity   : O(V+E)")
    print(f"   Algorithm Type     : Greedy (Single-Source)")
    print(f"   Compare to Floyd-Warshall: Dynamic Programming, All-Pairs, O(V³)")
    print(f"\n   Total execution time (4 standard runs) : {total_elapsed_ms:.4f} ms")
    print("=" * 65)


# ===========================================================================
#  HELPER — validate a FROM/TO pair and run+print a custom query
# ===========================================================================

def handle_route_query(start_raw: str, node_map: dict) -> None:
    """
    Validates a user-typed FROM intersection, prompts for TO, validates it,
    then runs dijkstra() and prints the result. Shared by both the regular
    "type an intersection" flow and the post-test follow-up prompt so the
    validation/printing logic only lives in one place.
    """
    start_matched = node_map.get(start_raw.lower())

    if start_matched is None:
        print(f"\n  ✘  '{start_raw}' is not a recognised intersection.")
        print("     Please use one of the names listed above.")
        return

    if start_matched == 'Isolated_Node':
        print("\n  ⚠  'Isolated_Node' has no roads — it cannot reach anywhere.")
        print("     (Demonstrating edge case: Dijkstra handles this gracefully.)")

    end_input = input("  Enter TO intersection            : ").strip()
    end_matched = node_map.get(end_input.lower())

    if end_matched is None:
        print(f"\n  ✘  '{end_input}' is not a recognised intersection.")
        print("     Please use one of the names listed above.")
        return

    if end_matched == 'Isolated_Node':
        print("\n  ⚠  'Isolated_Node' has no roads — nothing can reach it.")
        print("     (Demonstrating edge case: Dijkstra handles this gracefully.)")

    t_start = time.perf_counter()
    path, total_time = dijkstra(makati_map, start_matched, end_matched)
    elapsed_ms = (time.perf_counter() - t_start) * 1000

    print_route_result("Custom Query", start_matched, end_matched, path, total_time)
    print(f"  ⏱  Execution time : {elapsed_ms:.4f} ms")


# ===========================================================================
#  MAIN — interactive routing query loop
# ===========================================================================

def main():
    print("=" * 65)
    print("   MICRO-CITY TRAFFIC ROUTING SIMULATION")
    print("   Algorithm : Dijkstra's Algorithm (Greedy)")
    print("   City Map  : Makati CBD, Metro Manila")
    print("=" * 65)

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

    node_map = {n.lower(): n for n in makati_map.keys()}  # case-insensitive lookup

    while True:
        print("\n" + "-" * 65)
        user_input = input("  Enter command or FROM intersection: ").strip()

        # ── Exit ──────────────────────────────────────────────────────
        if user_input.lower() == 'quit':
            print("\n  Exiting simulation. Goodbye!\n")
            break

        # ── Run all test cases ────────────────────────────────────────
        if user_input.lower() == 'test':
            run_all_tests()

            # Explicit follow-up prompt right after the test results print,
            # so a custom query can be tried immediately without re-reading
            # the generic "Enter command or FROM intersection" prompt.
            print("\n" + "-" * 65)
            follow_up = input(
                "  Want to try a custom route? Enter FROM intersection (or press Enter to skip): "
            ).strip()
            if follow_up:
                handle_route_query(follow_up, node_map)
            continue

        # ── Custom route query ────────────────────────────────────────
        handle_route_query(user_input, node_map)


# ---------------------------------------------------------------------------
#  Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\n\n  Exiting simulation. Goodbye!\n")
