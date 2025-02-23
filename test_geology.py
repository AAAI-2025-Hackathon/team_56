import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import warnings
import logging
import os

# Suppress warnings and less important logging
warnings.filterwarnings('ignore')
logging.getLogger('transformers').setLevel(logging.ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class GeologyLLM:
    def __init__(self, model_path="./local_model"):
        """
        Initialize the model with proper configuration
        """
        print("Loading model from local storage...")
        
       
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=True
        )
        
     
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Set up device
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map="auto",
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            trust_remote_code=True
        )
        
    def generate_response(self, prompt, max_length=800):
        """
        Generate a response with proper error handling
        """
        try:
            # Create detailed prompt
            formatted_prompt = f"""As a geology expert, please provide a comprehensive explanation of:

{prompt}

Please include:
- Detailed explanations of key concepts
- Relevant examples where appropriate
- Scientific terminology with explanations
- Connections to broader geological processes

Response:"""

            # Tokenize input
            input_ids = self.tokenizer.encode(
                formatted_prompt,
                return_tensors="pt",
                add_special_tokens=True
            )
            
            # Move to appropriate device
            input_ids = input_ids.to(self.device)
            
            # Generate with carefully chosen parameters
            outputs = self.model.generate(
                input_ids,
                max_length=max_length,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                num_return_sequences=1,
                length_penalty=1.2,
                no_repeat_ngram_size=3,
                pad_token_id=self.tokenizer.pad_token_id
            )
            
            # Decode and clean up response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = response[len(formatted_prompt):].strip()
            
            return response
            
        except Exception as e:
            print(f"Detailed error: {type(e).__name__}: {str(e)}")
            return "Error generating response. Please check the error message above."

def test_geological_queries():
    """
    Test the model with geological queries
    """
    llm = GeologyLLM()
    
    test_prompts = [
        ("Sedimentary Rocks", 
         "Explain how sedimentary rocks form and what they tell us about Earth's history. "
         "Include specific examples of different types of sedimentary rocks and their formation processes."),
        
        ("Tectonic Plates", 
         "Describe the main types of tectonic plate boundaries and their geological features. "
         "Include examples of each type and explain how they shape Earth's surface."),
        
        ("Metamorphic Rocks", 
         "Explain the process of metamorphic rock formation, including the different types of metamorphism "
         "and the conditions required for each. Use specific examples to illustrate these processes.")
    ]
    
    print("\nBeginning geological knowledge tests...\n")
    for topic, prompt in test_prompts:
        print(f"\nTesting Topic: {topic}")
        print("-" * 50)
        print("Question:", prompt, "\n")
        print("Generating response...")
        response = llm.generate_response(prompt)
        print("\nResponse:")
        print(response)
        print("\n" + "="*80)

if __name__ == "__main__":
    test_geological_queries()




