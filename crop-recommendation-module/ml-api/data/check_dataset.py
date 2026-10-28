import pandas as pd

# Load the final dataset
file_path = "data/Crop_dataset.csv"
df = pd.read_csv(file_path)

print("\n========== DATASET VERIFICATION ==========\n")

# 1. Basic information
print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\nColumns:")
for col in df.columns:
    print("-", col)

# 2. Missing values
print("\nMissing values:")
print(df.isnull().sum())

# 3. Duplicate rows
print("\nDuplicate rows:", df.duplicated().sum())

# 4. Unique values
print("\nUnique crops:", df["Crop_Name"].nunique())
print("Unique soil types:", df["Soil_Type"].nunique())
print("Unique climate types:", df["Best_Climate"].nunique())
print("Unique categories:", df["Category"].nunique())

# 5. Check for NPK columns
npk_columns = [
    col for col in df.columns
    if any(x in col.lower() for x in ["nitrogen", "phosphorus", "potassium", "npk"])
]

print("\nNPK columns found:", npk_columns)

# 6. Show soil types
print("\n========== SOIL TYPES ==========\n")
for soil in sorted(df["Soil_Type"].unique()):
    print("-", soil)

# 7. Show climate types
print("\n========== CLIMATE TYPES ==========\n")
for climate in sorted(df["Best_Climate"].unique()):
    print("-", climate)

# 8. Show categories
print("\n========== CATEGORIES ==========\n")
for category in sorted(df["Category"].unique()):
    print("-", category)

print("\n========== VERIFICATION COMPLETE ==========\n")