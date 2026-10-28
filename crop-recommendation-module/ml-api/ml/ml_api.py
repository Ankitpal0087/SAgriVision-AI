from fastapi import FastAPI
from pydantic import BaseModel
from crop_recommender import explain_empty_result, recommend_crops
from climate_classifier import detect_climate

app = FastAPI()


class RecommendationRequest(BaseModel):
    soil: str
    season: str = "Any"
    climate: str
    category: str


class ClimateLocationRequest(BaseModel):
    latitude: float
    longitude: float


@app.get("/health")
@app.get("/")
def home():
    return {
        "message": "Crop Recommendation ML API is running"
    }


@app.post("/recommend")
def recommend(request: RecommendationRequest):

    results, match_type = recommend_crops(
        soil=request.soil,
        season=request.season,
        climate=request.climate,
        category=request.category,
        include_match_type=True
    )

    response = {
        "success": True,
        "count": len(results),
        "match_type": match_type,
        "match_mode": match_type,
        "recommendations": results,
        "message": "" if results else "No compatible crops found for these parameters."
    }
    if not results:
        response.update(explain_empty_result(
            request.soil, request.climate, request.category, request.season
        ))
    return response


@app.post("/climate-from-location")
def climate_from_location(request: ClimateLocationRequest):
    return detect_climate(request.latitude, request.longitude)
