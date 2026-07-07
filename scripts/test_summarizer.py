import bootstrap  # noqa: F401

from backend.app.services.summarizer import summarize_transcript

# Check if video_data.json exists
# if not os.path.exists("data/video_data.json"):
#     print("data/video_data.json not found. Run main.py first to fetch videos.")
#     raise SystemExit(1)

# try:
#     with open("data/video_data.json", "r", encoding="utf-8") as f:
#         videos = json.load(f)
# except json.JSONDecodeError:
#     print("data/video_data.json is invalid JSON. Run main.py again.")
#     raise

# transcript = None
# for video in videos:
#     if video.get("transcript"):
#         transcript = video["transcript"]
#         print("Testing with:", video.get("title"))
#         break

# if transcript:
#     print("Hold on while we summarize the transcript...")
#     valid_styles = ["bullet", "student", "narrative", "action", "cheatsheet", "eli5", "q&a", "executive brief"]
#     print("\nPick a style: bullet, student, narrative, action, cheatsheet, eli5, q&a, executive brief")
#     style = input("Enter style: ").strip().lower()
    
#     if style in valid_styles:
#         print("Summarizing...")
#         result = summarize_transcript(transcript, style)
#         print(result)
#     else:
#         print("Invalid style.")
# else:
#     print("No transcript found for any video. Make sure transcripts were fetched.")


transcript = """
Python is a high-level programming language known for its simplicity and readability. 
It was created by Guido van Rossum and released in 1991. Python supports multiple programming 
paradigms including procedural, object-oriented, and functional programming. It is widely used 
in web development, data science, artificial intelligence, automation, and scientific computing.
Python's syntax is clean and easy to learn, making it a popular choice for beginners. 
The language has a large standard library and an active community that contributes thousands 
of third-party packages. Popular frameworks include Django and Flask for web development, 
NumPy and Pandas for data analysis, and TensorFlow and PyTorch for machine learning.
Python uses indentation to define code blocks instead of curly braces. Variables are 
dynamically typed, meaning you don't need to declare their type. Python also supports 
list comprehensions, generators, decorators, and context managers as powerful features.
"""

print("\nPick a style: bullet, student, narrative, action, cheatsheet, eli5, qa, executive brief")
style = input("Enter style: ").strip().lower()

print("\nSummarizing...\n")
result = summarize_transcript(transcript, style)
print(result)
