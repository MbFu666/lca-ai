"""LCIA (Life Cycle Impact Assessment) methods."""
from typing import Optional


class LciaMethods:
    """Built-in LCIA methods with characterization factors."""

    METHODS = {
        "IPCC AR6 GWP100": {
            "description": "IPCC Sixth Assessment Report, Global Warming Potential 100-year",
            "unit": "kg CO2-eq",
            "factors": {
                "Carbon dioxide": 1.0,
                "Methane": 27.9,
                "Nitrous oxide": 273.0,
                "HFC-134a": 1530.0,
                "HFC-143a": 4470.0,
                "HFC-152a": 164.0,
                "PFC-14": 7390.0,
                "PFC-116": 12200.0,
                "SF6": 25200.0,
                "NF3": 17400.0,
                "Sulfur hexafluoride": 25200.0,
                "Nitrogen trifluoride": 17400.0,
            },
        },
        "IPCC AR5 GWP100": {
            "description": "IPCC Fifth Assessment Report, Global Warming Potential 100-year",
            "unit": "kg CO2-eq",
            "factors": {
                "Carbon dioxide": 1.0,
                "Methane": 28.0,
                "Nitrous oxide": 265.0,
                "HFC-134a": 1430.0,
                "PFC-14": 7390.0,
                "SF6": 22800.0,
                "NF3": 17200.0,
            },
        },
        "ReCiPe 2016 Midpoint": {
            "description": "ReCiPe 2016 Midpoint (H) - 18 impact categories",
            "unit": "various",
            "factors": {
                "Carbon dioxide": 1.0,
                "Methane": 28.0,
                "Nitrous oxide": 265.0,
                "Sulfur dioxide": 0.000976,
                "Nitrogen oxides": 0.00107,
                "Ammonia": 0.000178,
                "Phosphate": 0.594,
                "Water": 0.00000000087,
            },
        },
        "CML 2001": {
            "description": "CML 2001 - Climate Change (GWP100)",
            "unit": "kg CO2-eq",
            "factors": {
                "Carbon dioxide": 1.0,
                "Methane": 25.0,
                "Nitrous oxide": 298.0,
            },
        },
    }

    @classmethod
    def list_methods(cls) -> list[dict]:
        return [
            {
                "name": name,
                "description": method["description"],
                "unit": method["unit"],
            }
            for name, method in cls.METHODS.items()
        ]

    @classmethod
    def get_factors(cls, method_name: str) -> dict:
        method = cls.METHODS.get(method_name)
        if not method:
            return {}
        return method["factors"]

    @classmethod
    def get_unit(cls, method_name: str) -> str:
        method = cls.METHODS.get(method_name)
        if not method:
            return "kg CO2-eq"
        return method["unit"]

    @classmethod
    def get_description(cls, method_name: str) -> str:
        method = cls.METHODS.get(method_name)
        if not method:
            return ""
        return method["description"]
