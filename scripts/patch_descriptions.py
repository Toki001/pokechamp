import json

def patch_descriptions():
    print("Loading master JSON files...")
    
    # Load the abilities master list
    try:
        with open('pokemon_abilities.json', 'r', encoding='utf-8') as f:
            abilities_master = json.load(f)
    except FileNotFoundError:
        print("Error: pokemon_abilities.json not found.")
        return

    # Load the moves master list
    try:
        with open('pokemon_moves_master.json', 'r', encoding='utf-8') as f:
            moves_master = json.load(f)
    except FileNotFoundError:
        print("Error: pokemon_moves_master.json not found.")
        return

    # Create dictionaries for instant lookups
    ability_dict = {item['name']: item['description'] for item in abilities_master}
    
    # Note: Pulling from 'category' because that is where the description text ended up in the scrape
    move_dict = {item['name']: item['category'] for item in moves_master}

    # Load the Pokédex that needs fixing
    try:
        with open('pokemon_championsdex_full.json', 'r', encoding='utf-8') as f:
            pokedex = json.load(f)
    except FileNotFoundError:
        print("Error: pokemon_championsdex_full.json not found.")
        return

    abilities_fixed = 0
    moves_fixed = 0

    print("Patching descriptions...")
    
    # Loop through every Pokémon in the Pokédex
    for pokemon_name, data in pokedex.items():
        
        # 1. Patch Abilities
        for ability in data.get('abilities', []):
            if ability.get('description') == "Description not found.":
                # Look for the exact name in our master dictionary
                if ability['name'] in ability_dict:
                    ability['description'] = ability_dict[ability['name']]
                    abilities_fixed += 1

        # 2. Patch Moves
        for move in data.get('moves', []):
            if move.get('description') == "No additional effect.":
                # Look for the exact name in our master dictionary
                if move['name'] in move_dict:
                    move['description'] = move_dict[move['name']]
                    moves_fixed += 1

    # Save the updated Pokédex back to the same file
    with open('pokemon_championsdex_full.json', 'w', encoding='utf-8') as f:
        json.dump(pokedex, f, indent=4, ensure_ascii=False)

    print(f"\nSuccess! Patched {abilities_fixed} abilities and {moves_fixed} moves in pokemon_championsdex_full.json.")

if __name__ == "__main__":
    patch_descriptions()