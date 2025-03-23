import os
import google.generativeai as genai
from dotenv import load_dotenv

def test_gemini_models():
    """Test available Gemini models."""
    load_dotenv()
    
    # Get API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("ERROR: GOOGLE_API_KEY not found in environment variables")
        return
        
    print(f"Using API key: {api_key[:4]}...{api_key[-4:]}")
    genai.configure(api_key=api_key)
    
    # List available models
    try:
        models = genai.list_models()
        print(f"Found {len(models)} available models:")
        for model in models:
            print(f"- {model.name}")
            print(f"  Display name: {model.display_name}")
            print(f"  Description: {model.description}")
            print(f"  Supported generation methods: {model.supported_generation_methods}")
            print("")
    except Exception as e:
        print(f"Error listing models: {str(e)}")
    
    # Try to initialize models
    models_to_try = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-pro-vision'
    ]
    
    for model_name in models_to_try:
        try:
            print(f"Attempting to initialize model: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            # Test with a simple prompt
            response = model.generate_content("Hello, how are you?")
            
            print(f"SUCCESS: Model {model_name} initialized and tested successfully")
            print(f"Response: {response.text[:100]}...")
        except Exception as e:
            print(f"ERROR with {model_name}: {str(e)}")
        print("-" * 50)

if __name__ == "__main__":
    test_gemini_models() 