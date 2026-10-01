import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin
import re

def sanitize_filename(name):
    """Removes invalid characters so the OS doesn't crash when saving the file."""
    return re.sub(r'[\\/*?:"<>|]', "", name)

def download_image(url, folder, filename):
    """Downloads the image from the URL and saves it to the specified folder."""
    try:
        # Stream=True allows us to download the image file chunk by chunk
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            filepath = os.path.join(folder, filename)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
    except Exception as e:
        print(f"Failed to download {url}: {e}")

def scrape_images():
    # 1. Create the folders if they don't already exist
    os.makedirs("pokemon", exist_ok=True)
    os.makedirs("type-icons", exist_ok=True)
    
    options = webdriver.ChromeOptions()
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    
    base_url = "https://metaroll.app"
    
    # We use sets to keep track of what we've already downloaded.
    # This prevents the script from downloading the "Fire" type icon 100 times.
    downloaded_pokemon = set()
    downloaded_types = set()
    
    try:
        print("Loading MetaRoll...")
        driver.get(f"{base_url}/usage-stats")
        
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".usage-list-item"))
        )
        time.sleep(2)
        
        pokemon_buttons = driver.find_elements(By.CSS_SELECTOR, ".usage-list-item")
        print(f"Found {len(pokemon_buttons)} Pokémon. Starting image downloads...")

        for index, button in enumerate(pokemon_buttons):
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                time.sleep(0.5)
                button.click()
                time.sleep(0.5) # Fast wait just for the DOM to update
                
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                
                # --- DOWNLOAD POKÉMON HERO IMAGE ---
                name_element = soup.find(class_='usage-hero-link')
                hero_img = soup.find('img', class_='usage-hero-sprite')
                
                if name_element and hero_img and hero_img.has_attr('src'):
                    raw_name = name_element.text.strip()
                    safe_name = sanitize_filename(raw_name)
                    
                    if safe_name not in downloaded_pokemon:
                        # Joins the relative src (e.g., /pokemon/rillaboom.webp) with the base URL
                        img_url = urljoin(base_url, hero_img['src'])
                        
                        # Gets the extension (.webp or .png) dynamically from the URL
                        ext = img_url.split('.')[-1] 
                        filename = f"{safe_name}.{ext}"
                        
                        download_image(img_url, "pokemon", filename)
                        downloaded_pokemon.add(safe_name)
                        print(f"[{index + 1}/{len(pokemon_buttons)}] Saved Pokémon: {filename}")

                # --- DOWNLOAD TYPE ICONS ---
                type_imgs = soup.find_all('img', class_='usage-move-type')
                for t_img in type_imgs:
                    if t_img.has_attr('title') and t_img.has_attr('src'):
                        type_name = sanitize_filename(t_img['title'].strip())
                        
                        if type_name not in downloaded_types:
                            type_url = urljoin(base_url, t_img['src'])
                            ext = type_url.split('.')[-1]
                            filename = f"{type_name}.{ext}"
                            
                            download_image(type_url, "type-icons", filename)
                            downloaded_types.add(type_name)
                            print(f"  -> Saved New Type Icon: {filename}")
                            
            except Exception as e:
                print(f"Error at index {index}: {e}")
                continue

        print("\nSuccessfully finished downloading all images!")

    except Exception as e:
        print(f"Script crashed: {e}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_images()