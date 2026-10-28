import unittest

from climate_classifier import _precipitation_threshold, classify_koppen


class KoppenClassificationTests(unittest.TestCase):
    def test_tropical_classes(self):
        self.assertEqual(classify_koppen([26] * 12, [100] * 12), "Af")
        self.assertEqual(classify_koppen([26] * 12, [50, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120]), "Am")
        self.assertEqual(classify_koppen([26] * 12, [10, 10, 10, 200, 200, 200, 200, 200, 200, 10, 10, 10]), "Aw")
        self.assertEqual(classify_koppen([26] * 12, [200, 200, 200, 10, 10, 10, 10, 10, 10, 200, 200, 200]), "As")

    def test_desert_and_steppe_classes(self):
        self.assertEqual(classify_koppen([30] * 12, [10] * 12), "BWh")
        self.assertEqual(classify_koppen([30] * 12, [40] * 12), "BSh")
        self.assertEqual(classify_koppen([10] * 12, [10] * 12), "BWk")

    def test_temperate_and_continental_classes(self):
        c_temperatures = [8, 9, 11, 15, 19, 23, 26, 26, 22, 17, 12, 9]
        self.assertEqual(classify_koppen(c_temperatures, [80] * 12), "Cfa")
        self.assertEqual(classify_koppen(c_temperatures, [5, 5, 5, 100, 100, 100, 100, 100, 100, 5, 5, 5]), "Cwa")
        self.assertEqual(classify_koppen(c_temperatures, [100, 100, 100, 5, 5, 5, 5, 5, 5, 100, 100, 100]), "Csa")
        self.assertEqual(classify_koppen([8, 9, 11, 15, 19, 21, 21, 21, 18, 14, 10, 8], [80] * 12), "Cfb")
        self.assertEqual(classify_koppen([-5, -3, 0, 6, 12, 18, 23, 24, 18, 10, 2, -3], [80] * 12), "Dfa")

    def test_polar_classes(self):
        self.assertEqual(classify_koppen([-5, 0, 2, 4, 6, 8, 9, 9, 7, 4, 1, -3], [20] * 12), "ET")
        self.assertEqual(classify_koppen([-15, -14, -12, -10, -8, -5, -2, -1, -4, -8, -12, -14], [20] * 12), "EF")

    def test_southern_hemisphere_season_selection(self):
        temperatures = [27, 27, 26, 24, 22, 20, 19, 19, 21, 24, 26, 27]
        precipitation = [200, 200, 200, 10, 10, 10, 10, 10, 10, 200, 200, 200]
        self.assertEqual(classify_koppen(temperatures, precipitation, latitude=-20), "Aw")

    def test_thresholds_and_edge_cases(self):
        self.assertEqual(_precipitation_threshold(20, 0.70), 680)
        self.assertEqual(_precipitation_threshold(20, 0.30), 540)
        self.assertEqual(_precipitation_threshold(20, 0.299), 400)
        self.assertEqual(classify_koppen([20] * 12, [45] * 12), "Aw")
        self.assertEqual(classify_koppen([20] * 12, [44.9] * 12), "BSh")
        self.assertEqual(classify_koppen([25] * 12, [0] * 12), "BWh")
        self.assertEqual(classify_koppen([-5, -3, 0, 3, 6, 8, 10, 9, 7, 4, 1, -3], [80] * 12), "Dfc")

    def test_invalid_monthly_inputs(self):
        with self.assertRaises(ValueError):
            classify_koppen([20] * 11, [50] * 12)
        with self.assertRaises(ValueError):
            classify_koppen([20] * 12, [50] * 11)
        with self.assertRaises(ValueError):
            classify_koppen([20] * 11 + [float("nan")], [50] * 12)
        with self.assertRaises(ValueError):
            classify_koppen([20] * 12, [50] * 11 + [-1])


if __name__ == "__main__":
    unittest.main()
