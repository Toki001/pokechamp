import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

def extract_abilities_from_page(driver, all_abilities):
    """Parses the current page source and appends new abilities to the list."""
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    rows = soup.find_all('tr')
    
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 2:
            # Name is in the first column
            name_text = cells[0].text.strip().split('\n')[0].strip()
            # Description is housed in the final column
            description = cells[-1].text.strip()
            
            if name_text and name_text.lower() != "ability" and not any(a['name'] == name_text for a in all_abilities):
                all_abilities.append({
                    "name": name_text,
                    "description": description
                })

def scrape_abilities_data():
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    url = "https://pokebase.app/pokemon-champions/abilities"
    all_abilities = []
    total_pages = 4
    
    try:
        print(f"Loading PokeBase Abilities (Page 1/{total_pages})...")
        driver.get(url)
        
        for current_page in range(1, total_pages + 1):
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "table"))
            )
            # Give the table a second to fully inject the text
            time.sleep(1)
            
            extract_abilities_from_page(driver, all_abilities)
            print(f"  -> Extracted {len(all_abilities)} abilities so far.")
            
            if current_page < total_pages:
                # PAUSE SCRIPT FOR MANUAL CLICK
                print(f"\n[ACTION REQUIRED]")
                print(f"1. Go to the Chrome window and manually click the 'Next' arrow for Page {current_page + 1}.")
                print(f"2. Wait for the new abilities to appear.")
                input(f"3. Press ENTER right here in the terminal to continue scraping...")
                
                # Brief wait after you press Enter to ensure DOM is ready
                time.sleep(1)

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()
        
    if all_abilities:
        with open("pokemon_abilities.json", "w", encoding="utf-8") as f:
            json.dump(all_abilities, f, indent=4, ensure_ascii=False)
        print(f"\nSuccess! Saved {len(all_abilities)} abilities to 'pokemon_abilities.json'.")

if __name__ == "__main__":
    scrape_abilities_data()