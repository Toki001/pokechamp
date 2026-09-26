import json
import urllib.request
import os

def extract_metaroll_data():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, 'live_meta.json')

    print("Targeting metaroll.app for actual Pokémon Champions statistics...")
    
    url = "https://metaroll.app/usage/IG.json"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                raw_data = json.loads(response.read().decode('utf-8'))
                
                # Extract the specific "entries" array shown in your screenshot
                entries = raw_data.get("entries", [])
                
                real_data = []
                for entry in entries:
                    # Parse abilities/items/teammates if they exist in the payload
                    items_list = [item.get("name", "") for item in entry.get("items", [])]
                    teammates_list = [tm.get("name", "") for tm in entry.get("teammates", [])]
                    
                    real_data.append({
                        "rank": entry.get("rank"),
                        "name": entry.get("name"),
                        # Fallback to 0 if usage is explicitly null as shown in the Rillaboom entry
                        "usage": entry.get("usage") or 0, 
                        "items": items_list if items_list else ["Data not provided"],
                        "teammates": teammates_list if teammates_list else ["Data not provided"]
                    })
                
                with open(output_file, 'w') as f:
                    json.dump(real_data, f, indent=2)
                print(f"Success! Extracted {len(real_data)} meta Pokémon into {output_file}")
            else:
                print(f"Blocked by server (Status: {response.status}).")
                
    except Exception as e:
        print(f"Extraction failed: {e}")

if __name__ == "__main__":
    extract_metaroll_data()