"""Location climate detection using Open-Meteo and Köppen-Geiger criteria.

Current weather is returned for display only. The climate classification uses
the long-term, model-derived daily climate series, never today's temperature.
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "Crop_dataset.csv"
CURRENT_API = "https://api.open-meteo.com/v1/forecast"
CLIMATE_API = "https://climate-api.open-meteo.com/v1/climate"
CLIMATE_START = "1991-01-01"
CLIMATE_END = "2020-12-31"
CLIMATE_MODEL = "EC_Earth3P_HR"

# This is deliberately a translation layer, not a claim that the dataset's
# agricultural labels are official Köppen-Geiger names.
KOPPEN_TO_DATASET_CLIMATE = {
    "Af": "Humid Tropical", "Am": "Humid Tropical",
    "Aw": "Tropical", "As": "Tropical",
    "BWh": "Arid and Hot", "BWk": "Arid and Dry",
    "BSh": "Semi-arid", "BSk": "Semi-arid and Dry",
    "Cfa": "Humid Subtropical", "Cwa": "Humid Subtropical",
    "Cfb": "Temperate and Humid", "Cfc": "Cool and Humid",
    "Csa": "Mediterranean", "Csb": "Mediterranean", "Csc": "Cool and Dry",
    "Cwb": "Subtropical and Cool", "Cwc": "Subtropical and Cool",
    "Dfa": "Temperate and Humid", "Dfb": "Temperate and Humid",
    "Dfc": "Cool and Humid", "Dfd": "Cool and Dry",
    "Dwa": "Temperate and Dry", "Dwb": "Temperate and Dry",
    "Dwc": "Cool and Dry", "Dwd": "Cool and Dry",
    "Dsa": "Temperate and Dry", "Dsb": "Temperate and Dry",
    "Dsc": "Cool and Dry", "Dsd": "Cool and Dry",
    "ET": "Cool", "EF": "Cool and Wet",
}


def _dataset_climates() -> set[str]:
    with DATASET_PATH.open(newline="", encoding="utf-8") as handle:
        return {row["Best_Climate"].strip() for row in csv.DictReader(handle) if row["Best_Climate"].strip()}


def _get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "CropVisionAI climate service/1.0"})
    with urlopen(request, timeout=25) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("error"):
        raise RuntimeError(payload.get("reason", "Open-Meteo returned an error"))
    return payload


def _validate_coordinates(latitude: float, longitude: float) -> tuple[float, float]:
    latitude = float(latitude)
    longitude = float(longitude)
    if not math.isfinite(latitude) or not math.isfinite(longitude):
        raise ValueError("Latitude and longitude must be finite numbers")
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Latitude or longitude is outside its valid range")
    return latitude, longitude


def weather_condition(code: int | None) -> str:
    """Convert WMO weather codes returned by Open-Meteo into display text."""
    code = int(code) if code is not None else -1
    if code == 0: return "Clear Sky"
    if code in (1, 2): return "Partly Cloudy"
    if code == 3: return "Overcast"
    if code in (45, 48): return "Foggy"
    if code in (51, 53, 55, 56, 57): return "Drizzle"
    if code in (61, 63, 65, 66, 67): return "Rain"
    if code in (71, 73, 75, 77): return "Snow"
    if code in (80, 81, 82): return "Rain Showers"
    if code in (85, 86): return "Snow Showers"
    if code in (95, 96, 99): return "Thunderstorm"
    return "Unknown"


def _monthly_normals(times: list[str], temperatures: list[float | None], precipitation: list[float | None]) -> tuple[list[float], list[float]]:
    temperature_buckets = [[] for _ in range(12)]
    precipitation_buckets = [[] for _ in range(12)]
    for date, temperature, rain in zip(times, temperatures, precipitation):
        month = int(date[5:7]) - 1
        if temperature is not None:
            temperature_buckets[month].append(float(temperature))
        if rain is not None:
            precipitation_buckets[month].append(float(rain))
    if any(not values for values in temperature_buckets + precipitation_buckets):
        raise RuntimeError("Open-Meteo returned an incomplete long-term climate series")
    return (
        [sum(values) / len(values) for values in temperature_buckets],
        [sum(values) / len(values) for values in precipitation_buckets],
    )


def _seasonal_halves(monthly_temperatures: list[float], latitude: float = 0) -> tuple[set[int], set[int]]:
    """Return the warmer and cooler six-month halves used by Köppen-Geiger.

    AMJJAS and ONDJFM are compared by their mean temperature. Latitude is
    only a deterministic tie-break at the equator; it is not used to assume
    that one half-year is always summer.
    """
    amjjas = {3, 4, 5, 6, 7, 8}
    ondjfm = {9, 10, 11, 0, 1, 2}
    amjjas_mean = sum(monthly_temperatures[index] for index in amjjas) / 6
    ondjfm_mean = sum(monthly_temperatures[index] for index in ondjfm) / 6
    if amjjas_mean > ondjfm_mean or (amjjas_mean == ondjfm_mean and latitude >= 0):
        return amjjas, ondjfm
    return ondjfm, amjjas


def _precipitation_threshold(mean_annual_temperature: float, summer_fraction: float) -> float:
    """Return Köppen's B-climate precipitation threshold in mm.

    Peel et al. (2007) use 20*MAT plus 280 mm when at least 70% of annual
    precipitation falls in the warmer half-year, plus 140 mm when 30–70%
    falls there, and no adjustment when less than 30% falls there.
    """
    adjustment = 280 if summer_fraction >= 0.70 else 140 if summer_fraction >= 0.30 else 0
    return 20 * mean_annual_temperature + adjustment


def _validate_monthly_inputs(monthly_temperatures: list[float], monthly_precipitation: list[float]) -> None:
    if len(monthly_temperatures) != 12 or len(monthly_precipitation) != 12:
        raise ValueError("Köppen-Geiger requires twelve monthly temperature and precipitation values")
    if any(not math.isfinite(float(value)) for value in monthly_temperatures):
        raise ValueError("Monthly temperatures must be finite numbers")
    if any(not math.isfinite(float(value)) or float(value) < 0 for value in monthly_precipitation):
        raise ValueError("Monthly precipitation must be finite, non-negative numbers")


def classify_koppen(monthly_temperatures: list[float], monthly_precipitation: list[float], latitude: float = 0) -> str:
    """Classify monthly normals using the published Köppen-Geiger rules."""
    _validate_monthly_inputs(monthly_temperatures, monthly_precipitation)
    temperatures = [float(value) for value in monthly_temperatures]
    precipitation = [float(value) for value in monthly_precipitation]
    annual_temperature = sum(temperatures) / 12
    annual_precipitation = sum(precipitation)
    coldest = min(temperatures)
    warmest = max(temperatures)
    summer, winter = _seasonal_halves(temperatures, latitude)
    summer_rain = sum(precipitation[index] for index in summer)
    summer_fraction = summer_rain / annual_precipitation if annual_precipitation else 0

    # B climates are defined first. The threshold is 20*MAT plus a seasonal
    # adjustment, all in millimetres; the strict comparison preserves the
    # exact threshold as non-B climate.
    dry_threshold = _precipitation_threshold(annual_temperature, summer_fraction)
    if annual_precipitation < dry_threshold:
        dryness = "BW" if annual_precipitation < dry_threshold / 2 else "BS"
        return dryness + ("h" if annual_temperature >= 18 else "k")

    # A climates: coldest month >= 18 C, then Af -> Am -> Aw/As.
    if coldest >= 18:
        driest = min(precipitation)
        if driest >= 60:
            return "Af"
        monsoon_threshold = 100 - annual_precipitation / 25
        if driest >= monsoon_threshold:
            return "Am"
        driest_summer = min(precipitation[index] for index in summer)
        wettest_winter = max(precipitation[index] for index in winter)
        if driest_summer < 40 and driest_summer < wettest_winter / 3:
            return "As"
        return "Aw"

    # E climates: warmest month < 10 C; exactly 0 C belongs to EF.
    if warmest < 10:
        return "ET" if warmest > 0 else "EF"

    # C/D boundary and summer subtype thresholds.
    group = "C" if coldest > 0 else "D"
    months_at_or_above_10 = sum(temperature >= 10 for temperature in temperatures)
    if warmest >= 22:
        summer_letter = "a"
    elif months_at_or_above_10 >= 4:
        summer_letter = "b"
    elif group == "D" and coldest < -38:
        summer_letter = "d"
    else:
        summer_letter = "c"

    driest_summer = min(precipitation[index] for index in summer)
    wettest_summer = max(precipitation[index] for index in summer)
    driest_winter = min(precipitation[index] for index in winter)
    wettest_winter = max(precipitation[index] for index in winter)
    if driest_summer < 40 and driest_summer < wettest_winter / 3:
        precipitation_letter = "s"
    elif driest_winter < wettest_summer / 10:
        precipitation_letter = "w"
    else:
        precipitation_letter = "f"
    return group + precipitation_letter + summer_letter


def detect_climate(latitude: float, longitude: float) -> dict:
    latitude, longitude = _validate_coordinates(latitude, longitude)
    coordinates = {"latitude": latitude, "longitude": longitude, "timezone": "auto"}
    current_query = urlencode({**coordinates, "current": "temperature_2m,relative_humidity_2m,weather_code", "temperature_unit": "celsius"})
    climate_query = urlencode({
        "latitude": latitude, "longitude": longitude, "start_date": CLIMATE_START, "end_date": CLIMATE_END,
        "models": CLIMATE_MODEL, "daily": "temperature_2m_mean,precipitation_sum", "temperature_unit": "celsius",
    })
    current = _get_json(f"{CURRENT_API}?{current_query}")
    climate = _get_json(f"{CLIMATE_API}?{climate_query}")
    current_values = current.get("current", {})
    daily = climate.get("daily", {})
    monthly_temperatures, monthly_precipitation = _monthly_normals(
        daily.get("time", []), daily.get("temperature_2m_mean", []), daily.get("precipitation_sum", [])
    )
    koppen_code = classify_koppen(monthly_temperatures, monthly_precipitation, latitude)
    dataset_climate = KOPPEN_TO_DATASET_CLIMATE.get(koppen_code)
    if dataset_climate not in _dataset_climates():
        dataset_climate = None
    return {
        "success": True,
        "currentWeather": {
            "temperature": round(float(current_values["temperature_2m"])),
            "humidity": round(float(current_values["relative_humidity_2m"])),
            "condition": weather_condition(current_values.get("weather_code")),
        },
        "koppenCode": koppen_code,
        "climate": dataset_climate,
        "manualClimateRequired": dataset_climate is None,
        "climateDataNote": "Climate classification uses Open-Meteo model-derived 1991–2020 daily data, not direct historical station measurements.",
    }
