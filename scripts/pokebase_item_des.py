import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

def extract_items_from_page(driver, all_items):
    """Parses the current page source and appends new items to the list."""
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    rows = soup.find_all('tr')
    
    for row in rows:
        cells = row.find_all('td')
        # Ensure it's a data row (Name, Usage %, Description)
        if len(cells) >= 3:
            img = cells[0].find('img')
            
            if img and img.has_attr('alt'):
                item_name = img['alt'].strip()
                
                # The description is housed in the final column based on the screenshot
                description = cells[-1].text.strip()
                
                # Avoid duplicates
                if not any(item['name'] == item_name for item in all_items):
                    all_items.append({
                        "name": item_name,
                        "description": description
                    })

def scrape_item_data():
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    url = "https://pokebase.app/pokemon-champions/items"
    all_items = []
    
    try:
        print("Loading PokeBase Items (Page 1/2)...")
        driver.get(url)
        
        # Wait for the table to render
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))
        )
        time.sleep(2)
        
        # Extract Page 1
        extract_items_from_page(driver, all_items)
        print(f"  -> Extracted {len(all_items)} items.")
        
        # Navigate to Page 2 (Since it's exactly 2 pages, we only click once)
        print("Navigating to Page 2...")
        try:
            # Find the pagination buttons at the bottom. The '>' button is typically the last button.
            pagination_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
            next_button = pagination_buttons[-1]
            
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_button)
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", next_button)
            
            # Wait for the next page to load
            time.sleep(2)
            
            # Extract Page 2
            extract_items_from_page(driver, all_items)
            print(f"  -> Total items extracted: {len(all_items)}.")
            
        except Exception as e:
            print(f"Failed to navigate to Page 2: {e}")

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()
        
    if all_items:
        with open("pokemon_items.json", "w", encoding="utf-8") as f:
            json.dump(all_items, f, indent=4, ensure_ascii=False)
        print(f"\nSuccess! Saved {len(all_items)} items to 'pokemon_items.json'.")

if __name__ == "__main__":
    scrape_item_data()