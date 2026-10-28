"""Dataset-wide validation for the universal Season eligibility filter."""
from crop_recommender import CANONICAL_SEASONS, df, is_season_compatible, parse_seasons


def main():
    original_count = len(df)
    print(f"Original dataset rows: {original_count}")
    for selected in CANONICAL_SEASONS:
        filtered = df[df["Season"].apply(lambda value: is_season_compatible(value, selected))]
        assert all(selected in parse_seasons(value) for value in filtered["Season"])
        print(f"{selected} eligible rows: {len(filtered)}")

    any_filtered = df[df["Season"].apply(lambda value: is_season_compatible(value, "Any"))]
    assert len(any_filtered) == original_count
    print(f"Any eligible rows: {len(any_filtered)}")

    assert parse_seasons("Kharif; Zaid — region-dependent") == {"Kharif", "Zaid"}
    assert parse_seasons("Kharif; Rabi; Zaid — region-dependent") == {"Kharif", "Rabi", "Zaid"}
    assert parse_seasons("Perennial; region-dependent") == {"Perennial"}
    assert parse_seasons("Multiple seasons — region-dependent") == set()
    print("Season parser and dataset-wide eligibility checks passed.")


if __name__ == "__main__":
    main()
