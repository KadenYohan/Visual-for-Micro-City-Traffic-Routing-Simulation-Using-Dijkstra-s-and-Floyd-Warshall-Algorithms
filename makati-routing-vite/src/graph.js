// ===========================================================================
//  GRAPH DEFINITION — Makati CBD Micro-City Map
//  Same graph used in dijkstra.py and floyd_warshall_makati.py (Python)
//  Weights = travel time in minutes between intersections
// ===========================================================================
export const makati_map = {
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
    // EDGE CASE: isolated node with no connecting roads
    'Isolated_Node': {}
};
