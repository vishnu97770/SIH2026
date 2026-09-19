"""
Demo knowledge base for the Mine Intelligence prototype.

These are SAMPLE/SIMULATED mining report passages. They are NOT real
government documents. They exist only to demonstrate the RAG-style
retrieval + citation workflow.
"""

KNOWLEDGE_BASE = [
    {
        "doc": "Mine X Geological Report",
        "page": 14,
        "type": "Geological",
        "text": (
            "The geological survey of Mine X identified the presence of medium-hard strata across "
            "the south-eastern seam, which is prone to water ingress during the monsoon season. "
            "Structural fault lines near the main shaft increase the risk of roof caving. "
            "Blasting conditions required more frequent stemming and reduced daily output during "
            "wet periods."
        ),
    },
    {
        "doc": "Mine X Geological Report",
        "page": 15,
        "type": "Geological",
        "text": (
            "Reserves are estimated at 1.42 million tonnes of extractable coal. Ore grade remains "
            "consistent, though ash content rises in the deeper workings. Long-term extraction is "
            "expected to continue at planned capacity with appropriate ground support."
        ),
    },
    {
        "doc": "Mine X Inspection Report",
        "page": 27,
        "type": "Inspection",
        "text": (
            "Routine inspection observed significant production disruption caused by unplanned "
            "shaft maintenance between April and September 2024. Equipment downtime for the conveyor "
            "system totalled 41 days. Labour availability was reduced during the same period. "
            "These operational constraints directly contributed to the sharp production decline "
            "recorded in 2024."
        ),
    },
    {
        "doc": "Mine X Inspection Report",
        "page": 28,
        "type": "Inspection",
        "text": (
            "Water ingress from monsoon rainfall led to repeated sump overflows in the main haulage "
            "road. Inspectors recommended improved dewatering capacity and revised hoisting schedules "
            "to restore production to trend levels from 2025 onward."
        ),
    },
    {
        "doc": "Mine X Production Data",
        "page": "sheet",
        "type": "Production",
        "text": (
            "Annual production volumes: 2021: 98,000 tonnes; 2022: 108,000 tonnes; 2023: 119,000 "
            "tonnes; 2024: 87,000 tonnes; 2025: 121,000 tonnes. The 2024 figure represents a sharp "
            "decline compared with the prior year before recovering strongly in 2025."
        ),
    },
    {
        "doc": "Mine X Production Data",
        "page": "sheet",
        "type": "Production",
        "text": (
            "Production returned to a strong trajectory in 2025 at 121,000 tonnes, exceeding the "
            "2023 peak, following commissioning of the revised hoisting schedule and upgraded "
            "dewatering."
        ),
    },
]

# Topics/keywords used for simple demo retrieval. Each maps to one or more
# knowledge base indices.
RETRIEVAL_KEYWORDS = {
    "production_trend": ["production", "annual", "volume", "2021", "trend", "tonnes"],
    "decline_2024": ["decline", "2024", "drop", "disruption", "shaft", "maintenance"],
    "geological": ["geological", "strata", "water", "monsoon", "seam", "fault", "roof", "blasting"],
    "inspection": ["inspection", "downtime", "equipment", "conveyor", "labour", "hoisting", "dewatering"],
    "reserves": ["reserve", "1.42", "million", "coal", "grade", "ash"],
    "recovery": ["2025", "recover", "strong", "trajectory", "exceed"],
}
