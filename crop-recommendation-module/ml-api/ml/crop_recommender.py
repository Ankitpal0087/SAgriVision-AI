

from pathlib import Path
import re
import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.neighbors import NearestNeighbors

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "Crop_dataset.csv"
df = pd.read_csv(DATASET_PATH).fillna("")

FEATURES = ["Soil_Type", "Best_Climate"]
FEATURE_CATEGORIES = [
    sorted(df[feature].astype(str).str.strip().unique())
    for feature in FEATURES
]
MIN_SIMILARITY = 80.0
MAX_RECOMMENDATIONS = 15

CANONICAL_SEASONS = ("Kharif", "Rabi", "Zaid", "Perennial")
SEASON_TOKEN_PATTERN = re.compile(
    r"\b(?:Kharif|Rabi|Zaid|Perennial)\b",
    re.IGNORECASE
)


def parse_seasons(season_value):
    value = "" if season_value is None else str(season_value)
    found = {
        match.group(0).title()
        for match in SEASON_TOKEN_PATTERN.finditer(value)
    }
    return found & set(CANONICAL_SEASONS)


def is_season_compatible(crop_season, selected_season):
    if selected_season == "Any":
        return True

    if selected_season not in CANONICAL_SEASONS:
        return False

    return selected_season in parse_seasons(crop_season)


def _category_rows(category):
    return df[df["Category"].astype(str).str.strip() == str(category).strip()].copy()


def _eligible_rows(category, season):
    category_rows = _category_rows(category)
    return category_rows[category_rows["Season"].apply(
        lambda value: is_season_compatible(value, season)
    )].copy()


def supported_seasons(category):
    return [season for season in (*CANONICAL_SEASONS, "Any")
            if not _eligible_rows(category, season).empty]


def supported_categories(season):
    return [category for category in sorted(df["Category"].astype(str).str.strip().unique())
            if not _eligible_rows(category, season).empty]


def explain_empty_result(soil, climate, category, season):
    """Explain an empty result without changing recommendation eligibility."""
    if _category_rows(category).empty:
        return {
            "reason": "unsupported_category",
            "message": f"No dataset entries exist for the '{category}' category.",
            "alternative_filters": [{"season": season, "categories": supported_categories(season)}],
        }

    eligible_rows = _eligible_rows(category, season)
    if eligible_rows.empty:
        alternatives = [{"category": category, "season": value}
                        for value in supported_seasons(category) if value != season]
        return {
            "reason": "unsupported_category_season",
            "message": f"The '{category}' category has no crops compatible with the '{season}' season.",
            "alternative_filters": alternatives,
        }

    soil_values = sorted(eligible_rows["Soil_Type"].astype(str).str.strip().unique())
    climate_values = sorted(eligible_rows["Best_Climate"].astype(str).str.strip().unique())
    return {
        "reason": "below_similarity_threshold",
        "message": (
            f"Crops exist for '{category}' and '{season}', but none match the selected "
            f"soil and climate at the required {MIN_SIMILARITY:.0f}% similarity."
        ),
        "alternative_filters": [{
            "category": category, "season": season,
            "soil_options": soil_values[:10], "climate_options": climate_values[:10],
        }],
    }


def _metadata(row, similarity, match_type, distance):
    return {
        "Crop_Name": str(row["Crop_Name"]),
        "Similarity": similarity,
        "match_type": match_type,
        "match_details": {
            "soil": "nearest neighbor",
            "season": "match",
            "climate": "nearest neighbor",
            "category": "exact",
        },
        "Season": str(row["Season"]),
        "Water": int(float(row["Water_(L/season)"])),
        "Sunlight": str(row["Sunlight"]),
        "Harvest_Time": str(row["Harvest_Time"]),
    }


def _encode_features(data):
    encoder = OneHotEncoder(
        categories=FEATURE_CATEGORIES,
        handle_unknown="ignore",
        sparse_output=False
    )
    encoded = encoder.fit_transform(data[FEATURES].map(
        lambda value: str(value).strip()
    ))
    return encoded, encoder


def recommend_crops(
    soil,
    climate,
    category,
    season="Any",
    include_match_type=False
):
    # Category is an exact eligibility filter.
    # Category and season remain exact eligibility filters.
    season_rows = _eligible_rows(category, season)

    if season_rows.empty:
        return (([], "knn") if include_match_type else [])

    # Encode only the features used by KNN.
    X, encoder = _encode_features(season_rows)

    user_df = pd.DataFrame([{
        "Soil_Type": str(soil).strip(),
        "Best_Climate": str(climate).strip()
    }])

    user_X = encoder.transform(user_df[FEATURES])

    # Consider every eligible training row rather than limiting the
    # recommendation list to an arbitrary K=7 records.
    #
    # Hamming distance is calculated on the one-hot encoded categorical
    # features. Smaller distance means greater similarity.
    k = len(season_rows)

    knn = NearestNeighbors(
        n_neighbors=k,
        metric="hamming"
    )
    knn.fit(X)

    distances, indices = knn.kneighbors(user_X)
    distances = distances[0]
    indices = indices[0]

    # A crop may occur in multiple training rows. Keep the closest
    # occurrence for each unique crop name.
    crop_scores = {}

    for distance, index in zip(distances, indices):
        row = season_rows.iloc[index]
        crop_name = str(row["Crop_Name"])

        similarity = max(0.0, 1.0 - float(distance))
        similarity = round(similarity * 100, 2)

        # Ignore weak matches below the configured similarity threshold.
        if similarity < MIN_SIMILARITY:
            continue

        if (
            crop_name not in crop_scores
            or similarity > crop_scores[crop_name]["similarity"]
        ):
            crop_scores[crop_name] = {
                "similarity": similarity,
                "distance": float(distance),
                "row": row,
            }

    # Rank all eligible unique crops by KNN/Hamming similarity.
    ranked = sorted(
        crop_scores.values(),
        key=lambda item: (
            -item["similarity"],
            item["row"]["Crop_Name"]
        )
    )

    # Return at most the top 15 unique crops after threshold filtering.
    ranked = ranked[:MAX_RECOMMENDATIONS]

    recommendations = []

    for item in ranked:
        recommendations.append(
            _metadata(
                item["row"],
                item["similarity"],
                "knn",
                item["distance"]
            )
        )

    return (
        (recommendations, "knn")
        if include_match_type
        else recommendations
    )
