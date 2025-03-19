import os
import google.generativeai as genai
from dotenv import load_dotenv

def test_gemini():
    try:
        # Load environment variables
        load_dotenv()
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("API key not found in environment variables")
        
        print(f"API Key found: {api_key[:4]}...{api_key[-4:]}\n")
        
        # Configure the API
        genai.configure(api_key=api_key)
        
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Test content generation
        response = model.generate_content("Say hello!")
        print("Test response from Gemini:")
        print(response.text)
        print("\nTest successful!")
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Verify your API key is correct")
        print("2. Make sure you have enabled the Gemini API in your Google Cloud Console")
        print("3. Check if you have accepted the terms of service")
        print("4. Ensure you have proper access and permissions")

if __name__ == "__main__":
    test_gemini() 