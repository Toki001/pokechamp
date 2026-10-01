import os
import time
import requests
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

def sanitize_filename(name):
    """Removes invalid characters for saving files."""
    return re.sub(r'[\\/*?:"<>|]', "", name)

def download_image(url, folder, filename):
    """Downloads the image in chunks."""
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            filepath = os.path.join(folder, filename)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

def scrape_items():
    os.makedirs("items", exist_ok=True)
    
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    url = "https://pokebase.app/pokemon-champions/items"
    downloaded_items = set()
    
    try:
        print("Loading PokeBase Items...")
        driver.get(url)
        
        while True:
            # Wait for the table images to render
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "table"))
            )
            time.sleep(2)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Target the table rows containing the items
            rows = soup.find_all('tr')
            
            for row in rows:
                # Based on the screenshot, the img tag contains both the name (alt) and url (src)
                img = row.find('img')
                
                if img and img.has_attr('alt') and img.has_attr('src'):
                    item_name = img['alt'].strip()
                    img_url = img['src'].strip()
                    
                    # Ignore placeholder or UI images
                    if not item_name or item_name in downloaded_items:
                        continue
                        
                    safe_name = sanitize_filename(item_name)
                    
                    # Determine file extension from URL, defaulting to png if missing
                    ext = img_url.split('.')[-1].split('?')[0]
                    if len(ext) > 4: 
                        ext = "png"
                        
                    filename = f"{safe_name}.{ext}"
                    
                    print(f"Downloading: {filename}")
                    download_image(img_url, "items", filename)
                    downloaded_items.add(item_name)
            
            # Check for the 'Next Page' button and click it if it's available
            try:
                # Looks for the generic right-arrow pagination button based on standard text/icons
                next_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), '>') or span[contains(text(), '>')]]")
                
                if not next_buttons:
                    # Alternative approach: Find buttons at the bottom of the page that aren't disabled
                    pagination = driver.find_elements(By.CSS_SELECTOR, "button:not([disabled])")
                    next_button = pagination[-1] if pagination else None
                else:
                    next_button = next_buttons[-1]
                
                # If the button is disabled or we can't click it, we've reached the last page
                if next_button and not next_button.get_attribute("disabled"):
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_button)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", next_button)
                    print("\nNavigating to next page...")
                    time.sleep(2) 
                else:
                    break
            except Exception:
                # No more pages found or button is unclickable
                break

        print(f"\nSuccess! Downloaded {len(downloaded_items)} item images to the 'items' folder.")

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_items()