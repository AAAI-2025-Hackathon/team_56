import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os

class DeepSeekSetup:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_name = "deepseek-ai/deepseek-llm-7b-chat"
        
    def check_system_requirements(self):
        """Check if system meets the basic requirements"""
        # Check CUDA availability
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"GPU detected with {gpu_memory:.2f}GB memory")
        else:
            print("No GPU detected, will run on CPU (this will be slower)")
            
        # Check available RAM
        try:
            import psutil
            ram_gb = psutil.virtual_memory().total / (1024**3)
            print(f"Available RAM: {ram_gb:.2f}GB")
        except ImportError:
            print("Could not check RAM - please install psutil")
            
        return {
            'cuda_available': cuda_available,
            'gpu_memory_gb': gpu_memory if cuda_available else 0,
            'ram_gb': ram_gb
        }
        
    def download_model(self, force_cpu=False):
        """Download and set up the model with appropriate settings"""
        try:
            # First, download the tokenizer
            print("Downloading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )
            
            # Determine device and quantization settings
            if torch.cuda.is_available() and not force_cpu:
                print("Setting up model for GPU...")
                device_map = "auto"
                torch_dtype = torch.float16  # Use half precision on GPU
            else:
                print("Setting up model for CPU...")
                device_map = "cpu"
                torch_dtype = torch.float32
                
            # Download and set up the model
            print("Downloading model... This may take a while...")
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                device_map=device_map,
                torch_dtype=torch_dtype,
                trust_remote_code=True,
                # Add quantization for memory efficiency
                load_in_8bit=True if torch.cuda.is_available() else False
            )
            
            return True
            
        except Exception as e:
            print(f"Error during model setup: {str(e)}")
            return False
            
    def test_model(self):
        """Perform a simple test of the model"""
        if not self.model or not self.tokenizer:
            print("Model not initialized. Please run download_model() first.")
            return False
            
        try:
            # Simple test prompt
            test_prompt = "What is geology?"
            
            # Tokenize input
            inputs = self.tokenizer(test_prompt, return_tensors="pt")
            if torch.cuda.is_available():
                inputs = inputs.to("cuda")
                
            # Generate response
            print("Generating test response...")
            outputs = self.model.generate(
                inputs["input_ids"],
                max_length=100,
                num_return_sequences=1,
                temperature=0.7
            )
            
            # Decode response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            print("\nTest Response:")
            print(response)
            
            return True
            
        except Exception as e:
            print(f"Error during model testing: {str(e)}")
            return False
            
    def save_model_locally(self, save_path):
        """Save the model to local storage"""
        if not self.model or not self.tokenizer:
            print("Model not initialized. Please run download_model() first.")
            return False
            
        try:
            # Create directory if it doesn't exist
            os.makedirs(save_path, exist_ok=True)
            
            # Save model and tokenizer
            print(f"Saving model to {save_path}...")
            self.model.save_pretrained(save_path)
            self.tokenizer.save_pretrained(save_path)
            
            print("Model saved successfully!")
            return True
            
        except Exception as e:
            print(f"Error saving model: {str(e)}")
            return False

# Example usage
if __name__ == "__main__":
    setup = DeepSeekSetup()
    
    # Check system requirements
    specs = setup.check_system_requirements()
    
    # Download and test model
    if setup.download_model():
        if setup.test_model():
            # Save model locally if successful
            setup.save_model_locally("./local_model")