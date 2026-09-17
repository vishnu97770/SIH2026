from __future__ import annotations

import re
from collections import Counter
from typing import Any

from ..data.knowledge_base import KNOWLEDGE_BASE
from .data_service import get_dataframe, get_session, has_data
from .document_service import get_all_chunks

_WORD_RE = re.compile(r"[a-zA-Z]{3,}")

_STOPWORDS = {
    "the", "and", "for", "are", "was", "were", "with", "that", "this", "from",
    "has", "have", "had", "not", "but", "you", "your", "all", "can", "will",
    "would", "could", "should", "what", "which", "when", "where", "who", "how",
    "why", "did", "does", "about", "into", "than", "then", "them", "they",
    "their", "there", "these", "those", "its", "also", "been", "being", "over",
    "under", "during", "before", "after", "between", "each", "more", "most",
    "some", "such", "only", "same", "very", "per", "any", "our", "out", "off",
    "on", "in", "of", "to", "is", "it", "as", "at", "by", "be", "or", "an",
    "a", "i", "me", "please", "tell", "show", "give",
}

# Topics an inquiry/document corpus tends to fall into. Order is fixed and
# feeds directly into the frontend's fixed categorical color assignment -
# never reorder or add a hue without re-checking CVD separation there.
TOPIC_KEYWORDS: list[tuple[str, str, tuple[str, ...]]] = [
    ("production", "Production & Output", ("production", "output", "tonnes", "tons", "produced", "dispatch", "despatch", "capacity", "yield")),
    ("target", "Targets & Achievement", ("target", "targets", "achievement", "plan", "planned", "goal")),
    ("anomaly", "Anomalies & Deviations", ("anomaly", "anomalies", "deviation", "outlier", "unusual", "decline", "disruption", "downtime")),
    ("forecast", "Forecast & Projections", ("forecast", "predict", "projection", "trend", "future", "recover", "recovery")),
    ("geography", "Geography & Regional Spread", ("state", "district", "region", "location", "area", "zone", "seam", "shaft")),
    ("mineral", "Minerals & Commodities", ("mineral", "coal", "iron", "ore", "manganese", "commodity", "reserve", "reserves", "grade")),
]
_KEYWORD_TO_TOPIC = {kw: key for key, _, kws in TOPIC_KEYWORDS for kw in kws}


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in _WORD_RE.findall(text or "") if w.lower() not in _STOPWORDS]


def _topic_for_word(word: str) -> str | None:
    return _KEYWORD_TO_TOPIC.get(word)


def _dataset_keyword_counts() -> tuple[Counter, dict[str, str]]:
    counts: Counter = Counter()
    entity_topics: dict[str, str] = {}
    if not has_data():
        return counts, entity_topics

    df = get_dataframe()
    has_production = "production" in df.columns

    for column, topic in (("mine", "production"), ("mineral", "mineral"), ("state", "geography"), ("district", "geography")):
        if column not in df.columns:
            continue
        if has_production:
            grouped = df.groupby(column)["production"].sum()
        else:
            grouped = df[column].value_counts()
        for name, value in grouped.items():
            name = str(name)
            if not name.strip() or name.lower() == "nan":
                continue
            # Weight dataset entities heavily - they are the ground truth,
            # not incidental word mentions.
            counts[name] += max(1, int(round(float(value))))
            entity_topics[name] = topic
    return counts, entity_topics


def _document_word_counts() -> Counter:
    counts: Counter = Counter()
    uploaded_chunks = get_all_chunks()
    corpus = uploaded_chunks if uploaded_chunks else KNOWLEDGE_BASE
    for entry in corpus:
        for word in _tokenize(entry["text"]):
            counts[word] += 1
    return counts


def _inquiry_word_counts() -> Counter:
    """Word frequency over the questions actually asked in this session's
    chat history - surfaces what people keep asking about, mirroring how a
    real inquiry log (parliamentary/administrative questions) would be
    mined for recurring topics."""
    counts: Counter = Counter()
    session = get_session()
    for turn in session.chat_history:
        if turn.get("role") != "user":
            continue
        for word in _tokenize(turn.get("content", "")):
            counts[word] += 1
    return counts


def build_wordcloud(limit: int = 45) -> dict[str, Any]:
    dataset_counts, entity_topics = _dataset_keyword_counts()
    document_counts = _document_word_counts()
    inquiry_counts = _inquiry_word_counts()

    combined: Counter = Counter()
    combined.update(dataset_counts)
    combined.update(document_counts)
    combined.update({word: count * 2 for word, count in inquiry_counts.items()})

    if not combined:
        return {
            "has_data": False,
            "words": [],
            "topics": [],
            "sources": {"dataset_terms": 0, "document_terms": 0, "inquiry_terms": 0},
        }

    top = combined.most_common(limit)
    max_count = top[0][1]
    words = [
        {
            "text": word,
            "count": count,
            "weight": round(count / max_count, 3),
            "topic": entity_topics.get(word) or _topic_for_word(word.lower()),
        }
        for word, count in top
    ]

    topics = identify_topics(dataset_counts, entity_topics, document_counts, inquiry_counts)

    return {
        "has_data": True,
        "words": words,
        "topics": topics,
        "sources": {
            "dataset_terms": len(dataset_counts),
            "document_terms": len(document_counts),
            "inquiry_terms": len(inquiry_counts),
        },
    }


def identify_topics(
    dataset_counts: Counter, entity_topics: dict[str, str], document_counts: Counter, inquiry_counts: Counter
) -> list[dict[str, Any]]:
    scores: dict[str, int] = {key: 0 for key, _, _ in TOPIC_KEYWORDS}
    mention_words: dict[str, set[str]] = {key: set() for key, _, _ in TOPIC_KEYWORDS}

    # Dataset entities are counted once each here (not by production volume) so
    # that topic share reflects breadth of coverage, not the arbitrary scale of
    # tonnage - a topic shouldn't dominate just because one mine is huge.
    for word, topic in entity_topics.items():
        scores[topic] += 1
        mention_words[topic].add(word)

    for source_counts, source_weight in ((document_counts, 1), (inquiry_counts, 2)):
        for word, count in source_counts.items():
            topic = _topic_for_word(word.lower())
            if topic:
                scores[topic] += count * source_weight
                mention_words[topic].add(word)

    total = sum(scores.values())
    results = []
    for key, label, keywords in TOPIC_KEYWORDS:
        score = scores[key]
        results.append(
            {
                "topic": key,
                "label": label,
                "mentions": score,
                "share": round(score / total, 3) if total else 0.0,
                "keywords": sorted(mention_words[key])[:8] or list(keywords[:5]),
            }
        )
    results.sort(key=lambda r: r["mentions"], reverse=True)
    return results
