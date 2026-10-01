import json
import requests
import time

def format_name_for_api(name):
    """
    Converts formatted names from the website into the format PokéAPI uses.
    Example: "Indeedee [Female]" -> "indeedee-female"
             "Arcanine [Hisuian Form]" -> "arcanine-hisui"
    """
    api_name = name.lower()
    api_name = api_name.replace(" ", "-")
    api_name = api_name.replace("[", "").replace("]", "")
    api_name = api_name.replace("-form", "")
    api_name = api_name.replace("hisuian", "hisui")
    api_name = api_name.replace("galarian", "galar")
    api_name = api_name.replace("alolan", "alola")
    # Handle edge cases for specific punctuation
    api_name = api_name.replace("'", "").replace(".", "")
    return api_name

def get_english_description(flavor_text_entries):
    """Finds the most recent English description from the API data."""
    for entry in flavor_text_entries:
        if entry['language']['name'] == 'en':
            # Remove line breaks and weird formatting from the text
            return entry['flavor_text'].replace('\n', ' ').replace('\f', ' ')
    return "No description available."

def fetch_pokemon_moves():
    print("Loading Pokémon list from pokemon_stats.json...")
    try:
        with open("pokemon_stats.json", "r", encoding="utf-8") as f:
            scraped_pokemon = json.load(f)
    except FileNotFoundError:
        print("Error: pokemon_stats.json not found. Run the first scraper script again to generate it.")
        return

    # Cache to store move data so we don't fetch "Protect" 100 times
    move_details_cache = {}
    final_roster_data = []

    for index, p in enumerate(scraped_pokemon):
        original_name = p["pokemon"]
        api_name = format_name_for_api(original_name)
        
        print(f"[{index + 1}/{len(scraped_pokemon)}] Fetching moves for {original_name}...")
        
        # 1. Ask PokéAPI for the Pokémon's data
        poke_url = f"https://pokeapi.co/api/v2/pokemon/{api_name}"
        poke_response = requests.get(poke_url)
        
        if poke_response.status_code != 200:
            print(f"  -> API could not find '{api_name}'. Skipping.")
            continue
            
        poke_data = poke_response.json()
        pokemon_moves = []
        
        # 2. Iterate through every move this Pokémon can learn
        for move_info in poke_data['moves']:
            move_name_api = move_info['move']['name']
            move_url = move_info['move']['url']
            
            # 3. Check if we already downloaded this move's details
            if move_name_api not in move_details_cache:
                move_response = requests.get(move_url)
                if move_response.status_code == 200:
                    move_data = move_response.json()
                    
                    # Clean up the name (e.g., "high-horsepower" -> "High Horsepower")
                    clean_move_name = move_data['name'].replace('-', ' ').title()
                    
                    move_details_cache[move_name_api] = {
                        "name": clean_move_name,
                        "type": move_data['type']['name'].capitalize(),
                        "description": get_english_description(move_data['flavor_text_entries'])
                    }
                else:
                    continue
            
            # Add the cached move details to this Pokémon's list
            pokemon_moves.append(move_details_cache[move_name_api])
            
        final_roster_data.append({
            "pokemon": original_name,
            "total_moves": len(pokemon_moves),
            "learnset": pokemon_moves
        })
        
        # Be polite to the free API to avoid getting IP banned
        time.sleep(0.5)

    # 4. Save the massive dataset
    with open("pokemon_learnsets.json", "w", encoding="utf-8") as f:
        json.dump(final_roster_data, f, indent=4, ensure_ascii=False)
        
    print(f"\nSuccess! Downloaded movepools for {len(final_roster_data)} Pokémon.")
    print("Data saved to 'pokemon_learnsets.json'.")

if __name__ == "__main__":
    fetch_pokemon_moves()