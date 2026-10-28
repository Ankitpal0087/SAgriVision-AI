import unittest

from crop_recommender import explain_empty_result, recommend_crops


class RecommendationDiagnosticsTests(unittest.TestCase):
    def test_supported_combination_returns_recommendations(self):
        results = recommend_crops("Loam", "Tropical", "Food", "Kharif")
        self.assertTrue(results)
        self.assertTrue(all(item["Crop_Name"] for item in results))

    def test_unsupported_category_season_is_not_filled(self):
        results = recommend_crops("Loam", "Tropical", "Industrial", "Zaid")
        explanation = explain_empty_result("Loam", "Tropical", "Industrial", "Zaid")
        self.assertEqual(results, [])
        self.assertEqual(explanation["reason"], "unsupported_category_season")
        self.assertTrue(explanation["alternative_filters"])

    def test_nearest_valid_records_are_not_discarded_as_unknowns(self):
        results = recommend_crops("Sandy", "Arid", "Oil", "Rabi")
        self.assertTrue(results)
        self.assertIn("Safflower", {item["Crop_Name"] for item in results})
        self.assertTrue(all(item["Similarity"] >= 80 for item in results))

    def test_unknown_category_season_still_returns_empty(self):
        explanation = explain_empty_result("Loam", "Tropical", "Industrial", "Zaid")
        self.assertEqual(explanation["reason"], "unsupported_category_season")


if __name__ == "__main__":
    unittest.main()
