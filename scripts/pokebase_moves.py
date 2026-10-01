import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

def extract_moves_from_page(driver, all_moves):
    """Parses the current page source and appends new moves to the list."""
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    rows = soup.find_all('tr')
    
    for row in rows:
        cells = row.find_all(['td', 'th'])
        
        # Moves tables usually have at least 6-7 columns
        if len(cells) >= 6:
            # The move name is always first
            name_text = cells[0].text.strip().split('\n')[0].strip()
            
            # Skip header rows or empty rows
            if name_text.upper() == "MOVE" or not name_text:
                continue
            
            # Extract all cell data, prioritizing image alt text (for Type/Category icons)
            row_data = []
            for cell in cells:
                img = cell.find('img')
                if img and img.has_attr('alt') and img['alt']:
                    row_data.append(img['alt'].strip().capitalize())
                else:
                    # Clean up random linebreaks in text
                    row_data.append(cell.text.strip().replace('\n', ' '))
            
            # Prevent duplicates
            if not any(m['name'] == name_text for m in all_moves):
                
                # Assuming the standard 7 column layout: Name, Type, Category, Power, Accuracy, PP, Description
                # If there's an extra column (like Usage %), the description is always at the very end.
                move_entry = {
                    "name": name_text,
                    "type": row_data[1] if len(row_data) > 1 else "Unknown",
                    "category": row_data[2] if len(row_data) > 2 else "Unknown",
                    "power": row_data[3] if len(row_data) > 3 else "-",
                    "accuracy": row_data[4] if len(row_data) > 4 else "-",
                    "pp": row_data[5] if len(row_data) > 5 else "-",
                    "description": row_data[-1] # Grabs the last column no matter how wide the table is
                }
                
                # If the table structure is drastically different, save the raw row so data isn't lost
                if len(row_data) > 8:
                    move_entry["raw_data"] = row_data
                
                all_moves.append(move_entry)

def scrape_moves_data():
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    url = "https://pokebase.app/pokemon-champions/moves"
    all_moves = []
    page_num = 1
    
    try:
        print(f"Loading PokeBase Moves (Page {page_num})...")
        driver.get(url)
        
        while True:
            # Wait for the table to render
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "table"))
            )
            time.sleep(1)
            
            extract_moves_from_page(driver, all_moves)
            print(f"  -> Extracted {len(all_moves)} unique moves so far.")
            
            # Manual Intervention Pause
            print(f"\n[ACTION REQUIRED]")
            print(f"1. Go to the Chrome window and check if there is a 'Next' page.")
            print(f"2. If YES: Manually click the 'Next' arrow, wait for the table to change, then type 'y' and press ENTER.")
            print(f"3. If NO (You reached the end): Type 'n' and press ENTER to finish and save.")
            
            user_input = input("Are there more pages? (y/n): ").strip().lower()
            
            if user_input != 'y':
                print("Finishing up...")
                break
            
            page_num += 1
            print(f"\nProcessing Page {page_num}...")

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()
        
    if all_moves:
        with open("pokemon_moves_master.json", "w", encoding="utf-8") as f:
            json.dump(all_moves, f, indent=4, ensure_ascii=False)
        print(f"\nSuccess! Saved {len(all_moves)} moves to 'pokemon_moves_master.json'.")

if __name__ == "__main__":
    scrape_moves_data()