import requests
import time
from typing import Dict, Tuple, Optional
import json

class GeoTools:
    def __init__(self):
        #User-Agent header
        self.headers = {
            'User-Agent': 'MAGMA/1.0'
        }
        
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"
        self.macrostrat_url = "https://macrostrat.org/api/v2"
        
    def get_coordinates(self, location: str) -> Optional[Tuple[float, float]]:
        """
        Get latitude and longitude for a location using Nominatim
        
        Args:
            location (str): Place name or address
            
        Returns:
            Tuple[float, float]: (latitude, longitude) or None if not found
        """
        try:
          
            params = {
                'q': location,
                'format': 'json',
                'limit': 1
            }
            
            
            time.sleep(1)
            response = requests.get(
                self.nominatim_url,
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            
            
            data = response.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return (lat, lon)
            return None
            
        except Exception as e:
            print(f"Error getting coordinates: {str(e)}")
            return None
            
    def get_geological_data(self, lat: float, lon: float) -> Dict:
        """
        Get geological data from Macrostrat API
        
        Args:
            lat (float): Latitude
            lon (float): Longitude
            
        Returns:
            Dict: Geological data or empty dict if not found
        """
        try:
           
            params = {
                'lat': lat,
                'lng': lon
            }
            
            response = requests.get(
                f"{self.macrostrat_url}/geologic_units/map",
                params=params
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Error getting geological data: {str(e)}")
            return {}
            
    def save_to_cache(self, location: str, data: Dict, cache_file: str = 'geo_cache.json'):
        """
        Cache the geological data to avoid repeated API calls
        
        Args:
            location (str): Location string
            data (Dict): Data to cache
            cache_file (str): Path to cache file
        """
        try:
            
            try:
                with open(cache_file, 'r') as f:
                    cache = json.load(f)
            except FileNotFoundError:
                cache = {}
            
           
            cache[location] = {
                'timestamp': time.time(),
                'data': data
            }
            
            
            with open(cache_file, 'w') as f:
                json.dump(cache, f)
                
        except Exception as e:
            print(f"Error saving to cache: {str(e)}")