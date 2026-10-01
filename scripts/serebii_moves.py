import json
import requests
from bs4 import BeautifulSoup
import time
import re

def scrape_serebii_moves():
    try:
        with open("metaroll_stats.json", "r", encoding="utf-8") as f:
            pokemon_data = json.load(f)
            pokemon_list = [p["pokemon"] for p in pokemon_data]
    except FileNotFoundError:
        print("metaroll_stats.json not found. Using fallback list.")
        pokemon_list = ["Rillaboom", "Sneasler", "Indeedee-F"]
        
    all_moves_data = {}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # Suffixes to strip for accurate URL generation
    known_suffixes = [
        '-alola', '-galar', '-hisui', '-paldea', '-f', '-m', '-eternal', 
        '-low-key', '-dusk', '-midnight', '-heat', '-wash', '-frost', 
        '-fan', '-mow', '-super', '-small', '-large', '-combat', 
        '-blaze', '-aqua', '-yellow'
    ]
    
    # Manual overrides for Serebii's unique naming conventions
    manual_map = {
        "mrmime": "mr.mime",
        "mrrime": "mr.rime",
        "sirfetchd": "sirfetch'd",
        "farfetchd": "farfetch'd",
        "tauros-paldea": "tauros",
        "taurospaldea": "tauros"
    }

    total_pokemon = len(pokemon_list)

    for index, pokemon in enumerate(pokemon_list):
        # Format the base name
        base_name = pokemon.lower().replace(" ", "").replace(".", "")
        for suffix in known_suffixes:
            if base_name.endswith(suffix):
                base_name = base_name.replace(suffix, "")
                break
                
        url_name = manual_map.get(base_name, base_name)
        
        # Fallback system: If the custom Champions dex fails, it checks the main generation dexes
        urls_to_try = [
            f"https://www.serebii.net/pokedex-champions/{url_name}/",
            f"https://www.serebii.net/pokedex-sv/{url_name}/",
            f"https://www.serebii.net/pokedex-swsh/{url_name}/",
            f"https://www.serebii.net/pokedex-sm/{url_name}/"
        ]
        
        print(f"[{index + 1}/{total_pokemon}] Fetching moves for {pokemon} (via {url_name})...")
        
        html_content = None
        for url in urls_to_try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                html_content = response.content
                break
                
        if not html_content:
            print(f"  -> Page not found across all Serebii generations. Skipping.")
            continue
            
        soup = BeautifulSoup(html_content, 'html.parser')
        moves = []
        seen_moves = set()
        
        attack_links = soup.find_all('a', href=re.compile(r'/attackdex.*/.*\.shtml'))
        
        for link in attack_links:
            move_name = link.text.strip()
            if not move_name or move_name in seen_moves:
                continue
                
            move_row = link.find_parent('tr')
            if not move_row:
                continue
                
            cells = move_row.find_all('td')
            
            # 1. Type and Category extracted safely from images anywhere in the row
            images = move_row.find_all('img')
            move_type, move_cat = "Unknown", "Unknown"
            
            for img in images:
                if img.has_attr('src'):
                    img_name = img['src'].split('/')[-1].split('.')[0].capitalize()
                    # Serebii sometimes names the Status image "Other"
                    if img_name in ['Physical', 'Special', 'Other', 'Status']:
                        move_cat = "Status" if img_name == "Other" else img_name
                    else:
                        move_type = img_name
                        
            # 2. Stats extracted by counting from right-to-left
            clean_cells = [c.text.strip() for c in cells]
            if len(clean_cells) >= 4:
                move_power = clean_cells[-4]
                move_acc = clean_cells[-3]
                move_pp = clean_cells[-2]
                move_effect = clean_cells[-1]
            else:
                move_power, move_acc, move_pp, move_effect = ("", "", "", "")

            # 3. Description extracted from the next row
            description = "Description not found."
            next_row = move_row.find_next_sibling('tr')
            if next_row:
                desc_td = next_row.find('td')
                if desc_td:
                    description = re.sub(r'\s+', ' ', desc_td.text.strip())
            
            moves.append({
                "name": move_name,
                "type": move_type,
                "category": move_cat,
                "power": move_power,
                "accuracy": move_acc,
                "pp": move_pp,
                "effect_pct": move_effect,
                "description": description
            })
            seen_moves.add(move_name)
            
        all_moves_data[pokemon] = moves
        print(f"  -> Found {len(moves)} unique moves.")
        
        time.sleep(1) 

    with open("pokemon_serebii_moves.json", "w", encoding="utf-8") as f:
        json.dump(all_moves_data, f, indent=4, ensure_ascii=False)
        
    print(f"\nSuccess! Move data for {len(all_moves_data)} Pokémon saved to 'pokemon_serebii_moves.json'.")

if __name__ == "__main__":
    scrape_serebii_moves()