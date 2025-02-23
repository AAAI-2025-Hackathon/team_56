import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from typing import Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMProcessor:
    _instance = None 
    
    @classmethod
    def get_instance(cls, model_path="./local_model"):
        if cls._instance is None:
            cls._instance = cls(model_path)
        return cls._instance

    def __init__(self, model_path: str):
        try:
            logger.info("Initializing LLM Processor...")
            
         
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                logger.info(f"CUDA available. Memory before loading: {torch.cuda.memory_allocated()/1e9:.2f}GB")

           
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_path,
                trust_remote_code=True
            )
            
           
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
          
            bnb_config = BitsAndBytesConfig(
                load_in_8bit=True,
                bnb_8bit_compute_dtype=torch.float16
            )
            
           
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                device_map="auto",
                torch_dtype=torch.float16,
                quantization_config=bnb_config,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
            
            logger.info("Model loaded successfully")
            if torch.cuda.is_available():
                logger.info(f"Memory after loading: {torch.cuda.memory_allocated()/1e9:.2f}GB")
                
        except Exception as e:
            logger.error(f"Error initializing LLM: {str(e)}")
            raise

    def create_prompt(self, location: str, geo_data: Dict) -> str:
        """Create a prompt for geological analysis"""
        try:
            units = geo_data.get('success', {}).get('data', [])
            
            context = f"Location: {location}\n\nGeological Data:\n"
            
            if units:
                for unit in units:
                    context += f"""
- Formation: {unit.get('name', 'Unknown')}
- Age: {unit.get('b_age', 'Unknown')} to {unit.get('t_age', 'Unknown')} million years
- Rock Types: {unit.get('lith', 'Unknown')}
- Environment: {unit.get('environ', 'Unknown')}\n"""
            else:
                context += "No specific geological unit data available.\n"
            
            prompt = f"""{context}

As a geology expert, please provide a detailed analysis of this location, including:
1. Regional geological context
2. Rock formations and their relationships
3. Geological history and major events
4. Significant features and structures
5. Economic or scientific importance

Analysis:"""
            
            return prompt
            
        except Exception as e:
            logger.error(f"Error creating prompt: {str(e)}")
            raise

    def generate_description(self, prompt: str, max_length: int = 1000) -> str:
        """Generate geological description"""
        try:
            # Tokenize input
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=max_length,
                padding=True
            ).to(self.model.device)
            
            # Generate with memory-efficient settings
            with torch.inference_mode():
                outputs = self.model.generate(
                    input_ids=inputs["input_ids"],
                    attention_mask=inputs["attention_mask"],
                    max_length=max_length,
                    temperature=0.7,
                    do_sample=True,
                    num_return_sequences=1,
                    pad_token_id=self.tokenizer.pad_token_id,
                    no_repeat_ngram_size=3
                )
            
            # Decode output
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            description = generated_text[len(prompt):].strip()
            
            if not description:
                return "Unable to generate description. Please see basic geological information above."
                
            return description
            
        except Exception as e:
            logger.error(f"Error generating description: {str(e)}")
            return "Error generating description. Please try again later."



# from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
# import torch
# import logging
# from typing import Dict
# import warnings
# import colorama
# from colorama import Fore, Style

# # Initialize colorama for colored console output
# colorama.init()

# # Configure logging with colors
# class ColoredFormatter(logging.Formatter):
#     """Custom formatter for colored logs"""
    
#     COLORS = {
#         'WARNING': Fore.YELLOW,
#         'ERROR': Fore.RED,
#         'DEBUG': Fore.BLUE,
#         'INFO': Fore.GREEN,
#         'CRITICAL': Fore.RED + Style.BRIGHT
#     }

#     def format(self, record):
#         color = self.COLORS.get(record.levelname, '')
#         record.msg = f"{color}{record.msg}{Style.RESET_ALL}"
#         return super().format(record)

# # Set up logger
# logger = logging.getLogger('LLMProcessor')
# handler = logging.StreamHandler()
# handler.setFormatter(ColoredFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
# logger.addHandler(handler)
# logger.setLevel(logging.INFO)

# # Filter out specific warnings
# warnings.filterwarnings('ignore', message='.*MatMul8bitLt: inputs will be cast from.*')
# warnings.filterwarnings('ignore', category=UserWarning, module='transformers')

# class LLMProcessor:
#     def __init__(self, model_path: str):
#         try:
#             logger.info("🔄 Initializing LLM Processor...")
            
#             # Clear CUDA cache if available
#             if torch.cuda.is_available():
#                 torch.cuda.empty_cache()
#                 logger.info(f"💾 CUDA available. Memory before loading: {torch.cuda.memory_allocated()/1e9:.2f}GB")

#             self.tokenizer = AutoTokenizer.from_pretrained(
#                 model_path,
#                 trust_remote_code=True
#             )
            
#             if self.tokenizer.pad_token is None:
#                 self.tokenizer.pad_token = self.tokenizer.eos_token
#                 logger.debug("Padding token set to EOS token")

#             # Configure quantization
#             bnb_config = BitsAndBytesConfig(
#                 load_in_8bit=True,
#                 bnb_8bit_compute_dtype=torch.float16
#             )
            
#             with warnings.catch_warnings():
#                 warnings.simplefilter("ignore")
#                 self.model = AutoModelForCausalLM.from_pretrained(
#                     model_path,
#                     device_map="auto",
#                     torch_dtype=torch.float16,
#                     quantization_config=bnb_config,
#                     trust_remote_code=True,
#                     low_cpu_mem_usage=True
#                 )
            
#             logger.info("✅ Model loaded successfully")
#             if torch.cuda.is_available():
#                 logger.info(f"💾 Memory after loading: {torch.cuda.memory_allocated()/1e9:.2f}GB")
                
#         except Exception as e:
#             logger.error(f"❌ Error initializing LLM: {str(e)}")
#             raise

#     def create_prompt(self, location: str, geo_data: Dict) -> str:
#         """Create a comprehensive prompt for geological analysis in field trip report style"""
#         try:
#             units = geo_data.get('success', {}).get('data', [])
            
#             # Extract coordinates
#             location_coords = location.split(', ')
#             lat = location_coords[0].split(': ')[1]
#             lng = location_coords[1].split(': ')[1]
            
#             prompt = f"""As an experienced field geologist leading a student field mapping trip, provide a comprehensive field report for this location.

# LOCATION DETAILS:
# Coordinates: {lat}°N, {lng}°W
# [Describe the nearest geographical features, landmarks, and accessibility]

# GEOLOGICAL DATA FROM SURFACE MAPPING:
# """
#             if units:
#                 for unit in units:
#                     prompt += f"""
# Formation: {unit.get('name', 'Unknown')}
# Age Range: {unit.get('b_age', 'Unknown')} to {unit.get('t_age', 'Unknown')} million years
# Rock Types: {unit.get('lith', 'Unknown')}
# Depositional Environment: {unit.get('environ', 'Unknown')}

# """
            
#             prompt += """
# Please provide a detailed field report following this structure:

# 1. FIELD LOCATION AND ACCESS
# - Geographic context and nearest landmarks
# - Key outcrops and exposure quality
# - Field conditions and notable features

# 2. LITHOLOGICAL DESCRIPTION
# - Detailed rock unit descriptions
# - Sedimentary structures if present
# - Fossil content if any
# - Weathering characteristics

# 3. STRUCTURAL FEATURES
# - Bedding attitudes and variations
# - Folds and faults if present
# - Jointing and fracture patterns
# - Regional structural context

# 4. GEOLOGICAL HISTORY
# - Depositional environments through time
# - Major geological events
# - Regional correlation and significance

# 5. FIELD OBSERVATIONS AND INTERPRETATIONS
# - Key evidence for interpretations
# - Alternative hypotheses if applicable
# - Suggestions for further investigation

# Write this as if you are describing the location to geology students during a field mapping exercise.

# FIELD REPORT:
# """
#             logger.debug(f"Prompt created successfully for coordinates {lat}, {lng}")
#             return prompt
            
#         except Exception as e:
#             logger.error(f"Error creating prompt: {str(e)}")
#             raise

#     def generate_description(self, prompt: str, max_length: int = 2000) -> str:
#         """Generate geological description with increased completeness"""
#         try:
#             with warnings.catch_warnings():
#                 warnings.simplefilter("ignore")
                
#                 inputs = self.tokenizer(
#                     prompt,
#                     return_tensors="pt",
#                     truncation=True,
#                     max_length=max_length,
#                     padding=True
#                 ).to(self.model.device)
                
#                 with torch.inference_mode():
#                     outputs = self.model.generate(
#                         input_ids=inputs["input_ids"],
#                         attention_mask=inputs["attention_mask"],
#                         max_length=max_length,
#                         temperature=0.7,
#                         do_sample=True,
#                         num_return_sequences=1,
#                         pad_token_id=self.tokenizer.pad_token_id,
#                         no_repeat_ngram_size=3,
#                         length_penalty=1.5,
#                         min_length=800,
#                         top_p=0.9,
#                         top_k=50
#                     )
                
#                 generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
#                 description = generated_text[len(prompt):].strip()
                
#                 logger.info(f"Generated description of length: {len(description)}")
                
#                 return description
                
#         except Exception as e:
#             logger.error(f"Error generating description: {str(e)}")
#             return "Error generating description. Please try again later."
        
#     def generate_description(self, prompt: str, max_length: int = 2000) -> str:
#         """
#         Generates geological descriptions using the model, with careful handling of
#         GPU memory and tensor operations.
#         """
#         try:
#             # Prepare the input with proper formatting and device placement
#             encoded = self.tokenizer(
#                 prompt,
#                 return_tensors="pt",
#                 truncation=True,
#                 max_length=max_length,
#                 padding=True
#             ).to("cuda:0")  # Explicitly place tensors on GPU
            
#             # Generate text with memory-efficient settings
#             with torch.inference_mode():  # More efficient than no_grad for inference
#                 outputs = self.model.generate(
#                     input_ids=encoded["input_ids"],
#                     attention_mask=encoded["attention_mask"],
#                     max_length=max_length,
#                     temperature=0.7,        # Controls randomness in generation
#                     do_sample=True,         # Enable sampling for more natural text
#                     num_return_sequences=1,
#                     pad_token_id=self.tokenizer.pad_token_id,
#                     no_repeat_ngram_size=3  # Prevent repetitive text
#                 )
            
#             # Process the generated text
#             generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
#             description = generated_text[len(prompt):].strip()
            
#             if not description:
#                 return "Unable to generate description. Please see basic geological information above."
                
#             return description
            
#         except Exception as e:
#             print(f"Error generating description: {str(e)}")
#             return "Unable to generate description. Basic geological information is still available above."
