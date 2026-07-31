import os
import json
import re
import urllib.request
import urllib.error

# Configs
API_URL = "http://localhost:3000/api/tutor"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GOLDEN_SET_PATH = os.path.join(SCRIPT_DIR, "golden_set.json")
REPORT_PATH = os.path.join(SCRIPT_DIR, "eval_report.json")


def parse_user_input(user_input):
    """
    Parses user_input to extract page context if available.
    Example format:
    (Trang 14, đoạn được chọn: "some text")\nActual question
    """
    # Regex to match: (Trang 14, đoạn được chọn: "...")\nQuestion
    pattern_with_text = r'^\(Trang\s+(\d+),\s*đoạn\s+được\s+chọn:\s*"(.*?)"\)\n(.*)$'
    # Regex to match: (Trang 14)\nQuestion or (Trang 14, ...) without bôi đen text
    pattern_simple = r'^\(Trang\s+(\d+).*?\)\n(.*)$'

    match_text = re.match(pattern_with_text, user_input, re.DOTALL)
    if match_text:
        slide_num = int(match_text.group(1))
        selected_text = match_text.group(2)
        question = match_text.group(3).strip()
        return question, {"slideFrom": slide_num, "slideTo": slide_num, "selectedText": selected_text}

    match_simple = re.match(pattern_simple, user_input, re.DOTALL)
    if match_simple:
        slide_num = int(match_simple.group(1))
        question = match_simple.group(2).strip()
        return question, {"slideFrom": slide_num, "slideTo": slide_num}

    return user_input.strip(), None

def run_test_case(case):
    user_input = case.get("user_input", "")
    question, context = parse_user_input(user_input)
    
    # Determine document ID based on category/input
    document_id = "day01"
    if "day 02" in user_input.lower() or "day 2" in user_input.lower():
        document_id = "day02"
    elif "day 5" in user_input.lower() or "day05" in user_input.lower():
        document_id = "day05" # Synthetic out-of-scope test
        
    payload = {
        "documentId": document_id,
        "question": question,
        "context": context,
        "history": []
    }
    
    print(f"Running {case['id']}: Q: '{question[:40]}...' | Context: {context}")
    
    req = urllib.request.Request(
        API_URL, 
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            return {
                "status": "success",
                "answer": res_body.get("answer", ""),
                "sources": res_body.get("sources", [])
            }
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            return {"status": "error", "code": e.code, "message": err_body}
        except:
            return {"status": "error", "code": e.code, "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main():
    try:
        with open(GOLDEN_SET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {GOLDEN_SET_PATH}")
        return
        
    cases = data.get("cases", [])
    results = []
    
    print(f"Loaded {len(cases)} test cases from Golden Set.")
    print("Sending requests to Next.js API server...")
    
    for case in cases:
        api_res = run_test_case(case)
        result_case = {
            "id": case["id"],
            "category": case["category"],
            "test_scenario": case["test_scenario"],
            "user_input": case["user_input"],
            "parsed_question": parse_user_input(case["user_input"])[0],
            "parsed_context": parse_user_input(case["user_input"])[1],
            "baseline_response": case["baseline_response"],
            "actual_response": api_res.get("answer", "") if api_res.get("status") == "success" else f"ERROR: {api_res}",
            "actual_sources": api_res.get("sources", []) if api_res.get("status") == "success" else [],
            "status": api_res.get("status")
        }
        results.append(result_case)
        
    output_data = {
        "metadata": data.get("metadata", {}),
        "results": results
    }
    
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Evaluation report saved to {REPORT_PATH}")
    print("You can open it to compare 'baseline_response' with 'actual_response' and check 'actual_sources'.")

if __name__ == "__main__":
    main()
