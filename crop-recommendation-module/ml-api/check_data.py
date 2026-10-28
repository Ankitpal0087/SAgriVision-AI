import pandas as pd

file_path = "data/Crop_dataset_category_cleaned.csv"
df = pd.read_csv(file_path)

# Fix only capitalization duplicates in climate names
climate_mapping = {
    "Warm and dry": "Warm and Dry",
    "Cool and dry": "Cool and Dry",
    "Warm and sunny": "Warm and Sunny"
}

df["Best_Climate"] = df["Best_Climate"].replace(climate_mapping)

# Save final cleaned dataset
output_path = "data/Crop_dataset_cleaned_final.csv"
df.to_csv(output_path, index=False)

print("\n--- CLIMATE CLEANING COMPLETE ---")

print("\nClimate values after cleaning:")
for climate in sorted(df["Best_Climate"].unique()):
    print("-", climate)

print("\nSaved as:")
print(output_path)