import json
import time
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

def generate_slug(pokemon_name):
    slug = pokemon_name.lower().replace(" ", "-").replace(".", "").replace("'", "")
    manual_map = {
        "mr-mime": "mr-mime",
        "mr-rime": "mr-rime"
    }
    return manual_map.get(slug, slug)

def extract_type_defenses(soup):
    defenses = {"Weak to": [], "Resists": [], "Immune to": []}
    
    defense_section = soup.find('section', id='type-defenses')
    if not defense_section:
        return defenses
        
    summary_cards = defense_section.find_all('div', class_=lambda c: c and 'type-defense-summary-card' in c)
    for card in summary_cards:
        header = card.find('strong')
        if not header:
            continue
            
        category = header.text.strip()
        if category in defenses:
            chips = card.find_all('span', class_=lambda c: c and 'type-multiplier' in c)
            
            if not chips and 'none' in card.text.lower():
                defenses[category].append({"type": "None", "multiplier": ""})
                continue
                
            for chip in chips:
                label_span = chip.find('span', class_='type-mini-label')
                b_tag = chip.find('b')
                
                if label_span and label_span.has_attr('title'):
                    type_name = label_span['title'].strip()
                    multiplier = b_tag.text.strip() if b_tag else ""
                    
                    if not any(d['type'] == type_name for d in defenses[category]):
                        defenses[category].append({"type": type_name, "multiplier": multiplier})
                        
    return defenses

def extract_base_stats(soup):
    stats_data = {"BST": "", "spread": {}}
    
    bst_element = soup.find(lambda t: t.name in ['div', 'span', 'h2', 'h3'] and t.text and re.search(r'BST\s*\d+', t.text))
    if bst_element:
        match = re.search(r'BST\s*(\d+)', bst_element.text)
        if match:
            stats_data["BST"] = match.group(1)
            
    stat_rows = soup.find_all('div', class_='stat-row')
    for row in stat_rows:
        stat_name = row.find('span')
        stat_val = row.find('strong')
        
        if stat_name and stat_val:
            stats_data["spread"][stat_name.text.strip()] = stat_val.text.strip()
                
    return stats_data

def scrape_championsdex():
    try:
        with open("metaroll_stats.json", "r", encoding="utf-8") as f:
            pokemon_data = json.load(f)
            pokemon_list = [p["pokemon"] for p in pokemon_data]
    except FileNotFoundError:
        print("metaroll_stats.json not found. Using fallback list.")
        pokemon_list = ["Rillaboom", "Incineroar"]

    all_pokemon_data = {}
    
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    total_pokemon = len(pokemon_list)

    try:
        for index, pokemon in enumerate(pokemon_list):
            slug = generate_slug(pokemon)
            url = f"https://www.championsdex.app/pokemon/{slug}?format=Doubles"
            
            print(f"[{index + 1}/{total_pokemon}] Fetching data for {pokemon}...")
            driver.get(url)
            
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accuracy')]"))
                )
            except Exception:
                print(f"  -> Could not load page content for {pokemon}. Skipping.")
                continue
                
            abilities_data = []
            
            try:
                # Count the rows first to avoid StaleElementReferenceException during React state changes
                ability_rows_count = len(driver.find_elements(By.CSS_SELECTOR, "li.battle-snapshot-row-ability"))
                
                for i in range(ability_rows_count):
                    # Dynamically re-fetch the rows on every loop iteration
                    rows = driver.find_elements(By.CSS_SELECTOR, "li.battle-snapshot-row-ability")
                    if i >= len(rows):
                        break
                    row = rows[i]
                    
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", row)
                    time.sleep(0.3)
                    
                    try:
                        name_el = row.find_element(By.CSS_SELECTOR, "span.battle-snapshot-name")
                        ability_name = name_el.text.strip()
                    except Exception:
                        continue
                        
                    # Click the trigger button explicitly
                    try:
                        btn = row.find_element(By.CSS_SELECTOR, "button")
                        driver.execute_script("arguments[0].click();", btn)
                    except Exception:
                        driver.execute_script("arguments[0].click();", row)
                        
                    # CRITICAL DELAY: Give the React component time to mount and inject the text
                    time.sleep(0.8) 
                    
                    temp_soup = BeautifulSoup(driver.page_source, 'html.parser')
                    desc = "Description not found."
                    
                    # Target the exact ID of the tooltip panel
                    panel = temp_soup.find(id="battle-panel-ability")
                    if panel:
                        panel_text = panel.get_text(separator=' ', strip=True)
                        # Strip the name and any UI close buttons from the description string
                        clean_desc = panel_text.replace(ability_name, "", 1).strip()
                        clean_desc = re.sub(r'^[-✕×X]\s*', '', clean_desc).strip()
                        if clean_desc:
                            desc = clean_desc
                            
                    abilities_data.append({
                        "name": ability_name,
                        "description": desc
                    })
            except Exception as e:
                print(f"  -> Ability extraction issue: {e}")
                pass
                
            time.sleep(1)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Extract Pokemon Types
            pokemon_types = []
            badges_span = soup.find('span', class_='type-badges')
            if badges_span:
                imgs = badges_span.find_all('img')
                for img in imgs:
                    if img.has_attr('alt') and img['alt']:
                        pokemon_types.append(img['alt'].strip().capitalize())
            
            stats_data = extract_base_stats(soup)
            defenses_data = extract_type_defenses(soup)
            
            moves = []
            all_rows = soup.find_all('tr')
            if not all_rows:
                all_rows = soup.find_all(lambda tag: tag.has_attr('role') and tag['role'] == 'row')
            
            for row in all_rows:
                cells = row.find_all(['td', 'th'])
                if not cells:
                    cells = row.find_all(lambda tag: tag.has_attr('role') and tag['role'] in ['cell', 'gridcell'])
                
                if len(cells) == 7:
                    name_text = cells[0].text.strip()
                    if name_text.upper() == "MOVE":
                        continue
                        
                    type_text = "Unknown"
                    type_img = cells[1].find('img')
                    if type_img:
                        if type_img.has_attr('alt') and type_img['alt']:
                            type_text = type_img['alt'].strip()
                        elif type_img.has_attr('src'):
                            type_text = type_img['src'].split('/')[-1].split('.')[0].split('?')[0].capitalize()
                    
                    category = "Unknown"
                    cat_img = cells[2].find('img')
                    if cat_img:
                        if cat_img.has_attr('alt') and cat_img['alt']:
                            category = cat_img['alt'].strip()
                        elif cat_img.has_attr('src'):
                            category = cat_img['src'].split('/')[-1].split('.')[0].capitalize()
                            
                    power = cells[3].text.strip()
                    acc = cells[4].text.strip()
                    pp = cells[5].text.strip()
                    desc = re.sub(r'\s+', ' ', cells[6].text.strip())
                    
                    if pp.isdigit() or pp in ["--", "-", "—"]:
                        moves.append({
                            "name": name_text,
                            "type": type_text,
                            "category": category,
                            "power": power,
                            "accuracy": acc,
                            "pp": pp,
                            "description": desc
                        })
                
            all_pokemon_data[pokemon] = {
                "pokemon": pokemon,
                "types": pokemon_types,
                "base_stats": stats_data,
                "type_defenses": defenses_data,
                "abilities": abilities_data,
                "moves": moves
            }
            
            print(f"  -> Found {len(moves)} moves, BST: {stats_data.get('BST', 'N/A')}, Types: {len(pokemon_types)}, Abilities: {len(abilities_data)}")
            
    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()
        
    if all_pokemon_data:
        with open("pokemon_championsdex_full.json", "w", encoding="utf-8") as f:
            json.dump(all_pokemon_data, f, indent=4, ensure_ascii=False)
        print(f"\nSuccess! Saved full data for {len(all_pokemon_data)} Pokémon.")

if __name__ == "__main__":
    scrape_championsdex()