import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


# ==========================================
# 1. LOAD DATASET
# ==========================================

df = pd.read_csv("../data/Crop_dataset.csv")

print("Dataset shape:", df.shape)
print("\nColumns:")
print(df.columns.tolist())


# ==========================================
# 2. SELECT ML FEATURES
# ==========================================

X = df[["Soil_Type", "Best_Climate", "Category"]]
y = df["Crop_Name"]

print("\nNumber of unique crops:", y.nunique())
print("Number of soil types:", X["Soil_Type"].nunique())
print("Number of climate types:", X["Best_Climate"].nunique())
print("Number of categories:", X["Category"].nunique())


# ==========================================
# 3. TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


# ==========================================
# 4. ENCODE CATEGORICAL FEATURES
# ==========================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            ["Soil_Type", "Best_Climate", "Category"]
        )
    ]
)


# ==========================================
# 5. KNN MODEL
# ==========================================

knn_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", KNeighborsClassifier(n_neighbors=5))
    ]
)

knn_model.fit(X_train, y_train)

knn_predictions = knn_model.predict(X_test)

knn_accuracy = accuracy_score(y_test, knn_predictions)

print("\n================================")
print("KNN RESULTS")
print("================================")
print("Accuracy:", round(knn_accuracy * 100, 2), "%")


# ==========================================
# 6. RANDOM FOREST MODEL
# ==========================================

rf_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=100,
                random_state=42
            )
        )
    ]
)

rf_model.fit(X_train, y_train)

rf_predictions = rf_model.predict(X_test)

rf_accuracy = accuracy_score(y_test, rf_predictions)

print("\n================================")
print("RANDOM FOREST RESULTS")
print("================================")
print("Accuracy:", round(rf_accuracy * 100, 2), "%")


# ==========================================
# 7. COMPARISON
# ==========================================

print("\n================================")
print("MODEL COMPARISON")
print("================================")

print(f"KNN Accuracy:          {knn_accuracy * 100:.2f}%")
print(f"Random Forest Accuracy: {rf_accuracy * 100:.2f}%")


# ==========================================
# 8. DETAILED REPORT
# ==========================================

print("\nKNN Classification Report:")
print(classification_report(
    y_test,
    knn_predictions,
    zero_division=0
))

print("\nRandom Forest Classification Report:")
print(classification_report(
    y_test,
    rf_predictions,
    zero_division=0
))