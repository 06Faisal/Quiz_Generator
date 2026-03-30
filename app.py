"""
AI-Based MCQ Quiz Generator — Flask Backend
Uses Google Gemini API to generate multiple choice questions on any topic.
"""

import os
import re
import json
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)
CORS(app)


def build_prompt(topic: str, num_questions: int, difficulty: str) -> str:
    """Build the structured prompt for Gemini to generate MCQs."""
    return f"""Generate exactly {num_questions} multiple choice questions (MCQs) on the topic: '{topic}'.
Difficulty level: {difficulty}.

For each question, you MUST respond in the following strict JSON format and nothing else.
Return a JSON array of objects. Each object must have these keys:
- "question": The question text
- "options": An object with keys "A", "B", "C", "D" containing the four options
- "answer": The correct answer letter (A, B, C, or D)
- "explanation": A brief one-line explanation of why the answer is correct

Example format:
[
  {{
    "question": "What is the capital of France?",
    "options": {{
      "A": "London",
      "B": "Paris",
      "C": "Berlin",
      "D": "Madrid"
    }},
    "answer": "B",
    "explanation": "Paris is the capital and largest city of France."
  }}
]

IMPORTANT:
- Return ONLY the JSON array, no additional text or markdown.
- Ensure all {num_questions} questions are about '{topic}'.
- Difficulty should be {difficulty} level.
- Each question must have exactly 4 options (A, B, C, D).
- Only one option should be correct.
- Distractors should be plausible but clearly wrong."""


def parse_response(response_text: str) -> list:
    """Parse the LLM response text into a list of question dicts."""
    text = response_text.strip()

    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        questions = json.loads(text)
        if isinstance(questions, list):
            return questions
    except json.JSONDecodeError:
        pass

    # Fallback: try to find a JSON array in the text
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            questions = json.loads(match.group())
            if isinstance(questions, list):
                return questions
        except json.JSONDecodeError:
            pass

    return []


@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate_quiz():
    """Generate MCQs using Gemini API."""
    data = request.get_json()

    topic = data.get("topic", "").strip()
    num_questions = int(data.get("num_questions", 5))
    difficulty = data.get("difficulty", "Medium")

    if not topic:
        return jsonify({"error": "Please enter a topic."}), 400

    if num_questions < 1 or num_questions > 20:
        return jsonify({"error": "Number of questions must be between 1 and 20."}), 400

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "GEMINI_API_KEY not found. Please set it in your .env file."}), 500

    try:
        client = genai.Client(api_key=api_key)
        prompt = build_prompt(topic, num_questions, difficulty)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        response_text = response.text
        questions = parse_response(response_text)

        if not questions:
            return jsonify({"error": "Failed to parse the generated questions. Please try again."}), 500

        return jsonify({"questions": questions})

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Gemini API error: {error_msg}")
        if "API_KEY_INVALID" in error_msg:
            return jsonify({"error": "Invalid API key. Please check your GEMINI_API_KEY."}), 401
        elif "RESOURCE_EXHAUSTED" in error_msg:
            return jsonify({"error": "Rate limit exceeded. Please wait a moment and try again."}), 429
        else:
            return jsonify({"error": f"An error occurred: {error_msg}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
