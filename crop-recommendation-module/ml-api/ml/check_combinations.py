import pandas as pd

# Load dataset
df = pd.read_csv("../data/Crop_dataset.csv")

# Find duplicate crop entries within the SAME
# Soil + Climate + Category combination
duplicates = (
    df.groupby(
        ["Soil_Type", "Best_Climate", "Category", "Crop_Name"]
    )
    .size()
    .reset_index(name="record_count")
)

duplicates = duplicates[duplicates["record_count"] > 1]

print("\n======================================")
print("DUPLICATE CROP RECORD ANALYSIS")
print("======================================")

print("\nTotal duplicate crop-group combinations:", len(duplicates))

print("\nTotal extra duplicate records:",
      duplicates["record_count"].sub(1).sum())

print("\nTop duplicate groups:")

if len(duplicates) > 0:
    print(
        duplicates
        .sort_values("record_count", ascending=False)
        .head(30)
        .to_string(index=False)
    )
else:
    print("No duplicates found.")

print("\n======================================")
print("EXAMPLE")
print("======================================")

if len(duplicates) > 0:
    row = duplicates.iloc[0]

    print("Soil:", row["Soil_Type"])
    print("Climate:", row["Best_Climate"])
    print("Category:", row["Category"])
    print("Crop:", row["Crop_Name"])
    print("Number of records:", row["record_count"])