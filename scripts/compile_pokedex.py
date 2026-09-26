import json
import urllib.request
import os

# Create the target directory in the React source if it doesn't exist
output_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
os.makedirs(output_dir, exist_ok=True)
output_file = os.path.join(output_dir, 'pokemon.json')

# Fetch a comprehensive open-source raw JSON dataset
URL = "https://raw.githubusercontent.com/Purukitto/pokemon-data.json/master/pokedex.json"
print("Fetching raw Pokédex data...")

try:
    with urllib.request.urlopen(URL) as response:
        raw_data = json.loads(response.read().decode())
        
    optimized_pokedex = []
    
    for mon in raw_data:
        # Strip out the bloat and keep only what is required for the Team Builder and Damage Calc
        optimized_mon = {
            "id": mon.get("id"),
            "name": mon.get("name", {}).get("english"),
            "types": mon.get("type"),
            "baseStats": {
                "hp": mon.get("base", {}).get("HP"),
                "atk": mon.get("base", {}).get("Attack"),
                "def": mon.get("base", {}).get("Defense"),
                "spa": mon.get("base", {}).get("Sp. Attack"),
                "spd": mon.get("base", {}).get("Sp. Defense"),
                "spe": mon.get("base", {}).get("Speed")
            }
        }
        optimized_pokedex.append(optimized_mon)

    # Write the highly optimized array to the React src directory
    with open(output_file, 'w') as f:
        json.dump(optimized_pokedex, f, indent=2)
        
    print(f"Success! Compiled {len(optimized_pokedex)} Pokémon into {output_file}")

except Exception as e:
    print(f"Failed to compile Pokédex: {e}")