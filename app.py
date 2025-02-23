from flask import Flask, render_template, jsonify, request
from geo_tools import GeoTools
from config import Config
import traceback
import os
from llm_processor import LLMProcessor
from dotenv import find_dotenv, load_dotenv

app = Flask(__name__)
geo_tools = GeoTools()
llm_processor = LLMProcessor("./local_model") 

try:
    llm_processor = LLMProcessor("./local_model")
    print("LLM processor initialized successfully")
except Exception as e:
    print(f"Error initializing LLM processor: {str(e)}")
    traceback.print_exc()
    llm_processor = None

# Add debugging for environment setup
print(f"Current working directory: {os.getcwd()}")
print(f".env file location: {find_dotenv()}")
print(f"Environment variable before load_dotenv: {os.getenv('GOOGLE_MAPS_API_KEY')}")

# Load environment variables
load_dotenv()

print(f"Environment variable after load_dotenv: {os.getenv('GOOGLE_MAPS_API_KEY')}")

app = Flask(__name__)
app.config.from_object(Config)


print(f"Flask config after loading: {app.config.get('GOOGLE_MAPS_API_KEY')}")

@app.route('/debug')
def debug_config():
    return {
        'config_keys': list(app.config.keys()),
        'has_maps_key': 'GOOGLE_MAPS_API_KEY' in app.config,
        'maps_key_length': len(app.config.get('GOOGLE_MAPS_API_KEY', '')) if app.config.get('GOOGLE_MAPS_API_KEY') else 0,
        'environment_value': os.getenv('GOOGLE_MAPS_API_KEY'),
        'config_value': app.config.get('GOOGLE_MAPS_API_KEY'),
        'working_directory': os.getcwd(),
        'env_file_location': find_dotenv()
    }

@app.route('/')
def index():

    api_key = app.config.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("Warning: Google Maps API key is not available in config!")
     
        api_key = 'default-development-key'
    
    return render_template('index.html', google_maps_api_key=api_key)

@app.route('/api/geology/<float:lat>/<float:lng>')
def get_geology(lat, lng):
    """Get basic geological data for a location"""
    try:
        data = geo_tools.get_geological_data(lat, lng)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/description', methods=['POST'])
def get_description():
    """Get detailed geological description using LLM"""
    try:
        data = request.json
        lat = data['lat']
        lng = data['lng']
        geological_data = data['geological_data']
        
     
        location = f"Latitude: {lat}, Longitude: {lng}"
        
     
        processor = LLMProcessor("./local_model")
        prompt = processor.create_prompt(location, geological_data)
        description = processor.generate_description(prompt)
        
        return jsonify({
            'success': True,
            'description': description
        })
    except Exception as e:
        print(f"API Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to generate description',
            'description': 'Basic geological information is available above.'
        }), 200
        
if __name__ == '__main__':
    app.run(debug=True)


