from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json
import re

def extract_grid_data(container):
    """Helper function to extract rank and name from grid layouts."""
    results = []
    if not container:
        return results
        
    for item in container.find_all(class_='usage-mate'):
        text = item.text.strip()
        match = re.match(r'^(\d+)\s*(.*)', text)
        if match:
            results.append({"rank": match.group(1), "name": match.group(2).strip()})
        else:
            results.append({"rank": None, "name": text.strip()})
    return results

def get_move_type(element):
    """Helper function to extract the move type from the image title attribute."""
    if not element:
        return None
    img_tag = element.find('img', class_='usage-move-type')
    if img_tag and img_tag.has_attr('title'):
        return img_tag['title'].strip()
    return None

def scrape_metaroll_stats():
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    url = "https://metaroll.app/usage-stats"
    all_pokemon_data = []
    
    try:
        print("Loading MetaRoll...")
        driver.get(url)
        
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".usage-list-item"))
        )
        time.sleep(2)
        
        pokemon_buttons = driver.find_elements(By.CSS_SELECTOR, ".usage-list-item")
        print(f"Found {len(pokemon_buttons)} Pokémon in the list. Starting extraction...")

        for index, button in enumerate(pokemon_buttons):
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                time.sleep(0.5)
                button.click()
                time.sleep(1) 
                
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                
                name_element = soup.find(class_='usage-hero-link')
                if not name_element:
                    continue
                pokemon_name = name_element.text.strip()
                
                rank_element = soup.find(class_='usage-hero-rank')
                pokemon_rank = rank_element.text.strip() if rank_element else None
                
                pokemon_types = []
                hero_title = soup.find(class_='usage-hero-title')
                if hero_title:
                    type_badges = hero_title.find_all(class_='type-badge')
                    pokemon_types = [badge.text.strip() for badge in type_badges]

                print(f"[{index + 1}/{len(pokemon_buttons)}] Scraping stats for {pokemon_rank} {pokemon_name}...")

                current_stats = {
                    "rank": pokemon_rank,
                    "pokemon": pokemon_name,
                    "types": pokemon_types,
                    "moves": [],
                    "items": [],
                    "abilities": [],
                    "natures": [],
                    "stat_points": [],
                    "teammates": [],
                    "beats": [],
                    "loses_to": [],
                    "won_with": [],
                    "beaten_by": []
                }

                # --- EXTRACT STANDARD CARDS (Moves, Items, etc.) ---
                cards = soup.find_all('section', class_='usage-card')
                for card in cards:
                    header = card.find(class_='usage-card-head')
                    header_text = header.text.strip().upper() if header else ""
                    rows = card.find_all(class_='usage-stat-row')

                    if "MOVE" in header_text:
                        for row in rows:
                            name_el = row.find(class_='usage-stat-name')
                            pct_el = row.find(class_='usage-stat-pct')
                            if name_el and pct_el:
                                current_stats["moves"].append({
                                    "name": name_el.text.strip(), 
                                    "type": get_move_type(name_el),
                                    "usage": pct_el.text.strip()
                                })
                                
                    elif "ITEM" in header_text:
                        for row in rows:
                            name_el = row.find(class_='usage-stat-name')
                            pct_el = row.find(class_='usage-stat-pct')
                            if name_el and pct_el:
                                current_stats["items"].append({"name": name_el.text.strip(), "usage": pct_el.text.strip()})
                                
                    elif "ABILITY" in header_text:
                        for row in rows:
                            name_el = row.find(class_='usage-stat-name')
                            pct_el = row.find(class_='usage-stat-pct')
                            if name_el and pct_el:
                                current_stats["abilities"].append({"name": name_el.text.strip(), "usage": pct_el.text.strip()})
                                
                    elif "NATURE" in header_text:
                        for row in rows:
                            name_el = row.find(class_='usage-stat-name')
                            pct_el = row.find(class_='usage-stat-pct')
                            if name_el and pct_el:
                                current_stats["natures"].append({"name": name_el.text.strip(), "usage": pct_el.text.strip()})

                    elif "STAT" in header_text:
                        for row in rows:
                            pct_el = row.find(class_='usage-stat-pct')
                            boxes = row.find_all(class_='usage-sp-box')
                            if pct_el and boxes:
                                spread_dict = {}
                                for box in boxes:
                                    val_el = box.find(class_='usage-sp-value')
                                    lbl_el = box.find(class_='usage-sp-label')
                                    if val_el and lbl_el:
                                        spread_dict[lbl_el.text.strip()] = val_el.text.strip()
                                if spread_dict:
                                    current_stats["stat_points"].append({"spread": spread_dict, "usage": pct_el.text.strip()})

                # --- EXTRACT ISOLATED SECTIONS (Matchups, Teammates) ---
                def find_container_by_exact_text(text_to_match):
                    title_el = soup.find(lambda t: t.name in ['h2', 'h3', 'h4', 'div', 'span', 'p'] and t.text.strip().upper() == text_to_match.upper())
                    return title_el.parent.parent if title_el else None

                teammates_container = find_container_by_exact_text("COMMON TEAMMATES")
                current_stats["teammates"] = extract_grid_data(teammates_container)
                
                # --- MATCHUPS: BEATS & WON WITH ---
                beats_side = soup.find(class_='usage-matchup-beats')
                if beats_side:
                    beats_grid = beats_side.find(class_='usage-mates')
                    current_stats["beats"] = extract_grid_data(beats_grid)
                    
                    beats_rows = beats_side.find(class_='usage-rows')
                    if beats_rows:
                        # Notice we use 'usage-row' here instead of 'usage-stat-row'
                        for row in beats_rows.find_all(class_='usage-row'):
                            name_el = row.find(class_='usage-row-name')
                            pct_el = row.find(class_='usage-row-pct')
                            if name_el and pct_el:
                                current_stats["won_with"].append({
                                    "name": name_el.text.strip(), 
                                    "type": get_move_type(name_el),
                                    "usage": pct_el.text.strip()
                                })

                # --- MATCHUPS: LOSES TO & BEATEN BY ---
                loses_side = soup.find(class_='usage-matchup-loses')
                if loses_side:
                    loses_grid = loses_side.find(class_='usage-mates')
                    current_stats["loses_to"] = extract_grid_data(loses_grid)
                    
                    loses_rows = loses_side.find(class_='usage-rows')
                    if loses_rows:
                        for row in loses_rows.find_all(class_='usage-row'):
                            name_el = row.find(class_='usage-row-name')
                            pct_el = row.find(class_='usage-row-pct')
                            if name_el and pct_el:
                                current_stats["beaten_by"].append({
                                    "name": name_el.text.strip(), 
                                    "type": get_move_type(name_el),
                                    "usage": pct_el.text.strip()
                                })

                all_pokemon_data.append(current_stats)

            except Exception as e:
                print(f"Error scraping Pokémon at index {index}: {e}")
                continue

        if all_pokemon_data:
            with open("metaroll_stats.json", "w", encoding="utf-8") as f:
                json.dump(all_pokemon_data, f, indent=4, ensure_ascii=False)
            print(f"\nSuccess! Saved {len(all_pokemon_data)} Pokémon to 'metaroll_stats.json'.")

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_metaroll_stats()