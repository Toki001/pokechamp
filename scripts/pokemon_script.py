from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json

def scrape_pokemon_stats():
    # 1. Setup Chrome options to prevent hanging
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager' # Stops waiting for heavy ad trackers
    
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30) # Fails fast if the page gets stuck
    
    url = "https://www.pokemon-zone.com/champions/team-builder/"
    pokemon_data = []
    
    try:
        print("Loading webpage...")
        driver.get(url)
        time.sleep(2) 
        
        print("Opening slot menu...")
        slot_button = WebDriverWait(driver, 10).until(
             EC.element_to_be_clickable((By.CSS_SELECTOR, ".tb-slot-card.tb-slot-card--active"))
        )
        slot_button.click()
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".tb-picker__row")) 
        )
        time.sleep(1)

        print("Looking for 'Show 240 more' button...")
        try:
            show_more_btn = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'more low-usage')]"))
            )
            driver.execute_script("arguments[0].scrollIntoView(true);", show_more_btn)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", show_more_btn)
            print("Clicked! Loading extra Pokémon...")
            time.sleep(3) 
        except Exception as e:
            print(f"Could not click 'Show more' button: {e}")
        
        print("Extracting data...")
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        pokemon_rows = soup.find_all(class_='tb-picker__row')
        
        for row in pokemon_rows:
            try:
                name_element = row.find(class_='tb-picker__row-name-text')
                
                if not name_element:
                    continue
                    
                name = name_element.text.strip()
                stats = row.find_all(class_='tb-picker__row-stat-value')
                
                if len(stats) >= 2:
                    usage = stats[0].text.strip()
                    winrate = stats[1].text.strip()
                    
                    pokemon_data.append({
                        "pokemon": name,
                        "usage": usage,
                        "winrate": winrate
                    })
            except AttributeError:
                continue

        if pokemon_data:
            with open("pokemon_stats.json", "w", encoding="utf-8") as f:
                json.dump(pokemon_data, f, indent=4, ensure_ascii=False)
            print(f"Success! Saved {len(pokemon_data)} Pokémon to 'pokemon_stats.json'.")
        else:
            print("No data was extracted.")

    except Exception as e:
        print(f"Script failed: {e}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_pokemon_stats()