import google.generativeai as genai
from typing import List

class LLMService:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        # Configure the model
        generation_config = {
            "temperature": 0.7,
            "top_p": 1,
            "top_k": 1,
            "max_output_tokens": 2048,
        }
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
        ]
        
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            safety_settings=safety_settings
        )

    async def generate_response(self, query: str, context: List[str]) -> str:
        try:
            prompt = f"""Based on the following context, answer the question. 
            If the answer cannot be found in the context, say "I cannot find the answer in the provided document."
            
            Context:
            {' '.join(context)}
            
            Question: {query}
            
            Answer:"""

            response = self.model.generate_content(prompt)
            if response.prompt_feedback.block_reason:
                return "I apologize, but I cannot provide an answer due to content safety restrictions."
            return response.text
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I apologize, but I encountered an error while processing your question. Please try again." 