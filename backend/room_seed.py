import re
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import time
from selenium.common.exceptions import ElementClickInterceptedException
import psycopg2
import uuid

new_uuid = str(uuid.uuid4())


def connect_to_postgres():
    conn = psycopg2.connect(
        "dbname='cooperbookerdb' user='postgres' password='antfarm' host='localhost'"
    )
    return conn


def insert_room_data(conn, room_data):
    try:
        with conn.cursor() as cur:
            if "FDN" in room_data["room_name"]:
                building = "Foundation"
            elif "41CS" in room_data["room_name"]:
                building = "41CS"
            else:
                print(
                    f"Warning: Building prefix not recognized for room {room_data['room_name']}. Skipping insertion."
                )
                return

            th_floor_search = re.search(
                r"(\d+)(st|nd|rd|th) Floor", room_data["formal_name"]
            )
            general_floor_search = re.search(
                r"Room\s+([a-zA-Z]*)(\d)", room_data["formal_name"]
            )

            if th_floor_search:
                floor = th_floor_search.group(
                    1
                )
            elif general_floor_search:
                prefix = general_floor_search.group(1)
                digit = general_floor_search.group(2)
                floor = (
                    prefix + digit if prefix else digit
                )
            else:
                floor = "Other"

            # Add the building and floor data to room_data dictionary
            room_data["building"] = building
            room_data["floor"] = floor

            room_id = str(uuid.uuid4())
            room_data["rid"] = room_id
            # Insert into rooms table with the extracted building and floor information
            cur.execute(
                """
                INSERT INTO rooms (rid, room_name, formal_name, max_capacity, building, floor, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                """,
                (
                    room_id,
                    room_data["room_name"],
                    room_data["formal_name"],
                    room_data.get("max_capacity"),
                    room_data["building"],
                    room_data["floor"],
                ),
            )
            if "features" in room_data and room_data["features"]:
                features = room_data["features"].split(", ")
                for feature in features:
                    feature_id = str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO features (fid, name, "createdAt", "updatedAt")
                        VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING fid;
                        """,
                        (feature_id, feature),
                    )
                    feature_id = cur.fetchone()[0]
                    cur.execute(
                        """
                        INSERT INTO "roomFeatures" ("roomRid", "featureFid", "createdAt", "updatedAt")
                        VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT DO NOTHING;
                        """,
                        (room_id, feature_id),
                    )
            conn.commit()

    except psycopg2.Error as e:
        print(f"An error occurred: {e}")
        conn.rollback()


def safe_click_element(driver, element):
    try:
        driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(1)
        element.click()
    except:
        driver.execute_script("window.scrollBy(0, -150);")
        time.sleep(1)
        element.click()


# Initialize Selenium WebDriver
driver = webdriver.Chrome()
driver.get("https://25live.collegenet.com/pro/cooper#!/home/dash")
WebDriverWait(driver, 20).until(
    EC.presence_of_element_located((By.CSS_SELECTOR, "a.c-nav-signin"))
).click()
WebDriverWait(driver, 20).until(
    EC.presence_of_element_located(
        (By.CSS_SELECTOR, "input[aria-label='username']"))
)

# Login details
username_field = driver.find_element(
    By.CSS_SELECTOR, "input[aria-label='username']")
password_field = driver.find_element(
    By.CSS_SELECTOR, "input[aria-label='password']")
username_field.send_keys("faith.lin")
password_field.send_keys("Antf4rm!23")
sign_in_button = driver.find_element(
    By.CSS_SELECTOR, "button[aria-label='login button']"
)
sign_in_button.click()
time.sleep(5)

# Building data and connection setup
buildings = ["FDN", "41CS"]
base = "https://25live.collegenet.com/pro/cooper#!/home/search/location/list/&name="
conn = connect_to_postgres()

for building in buildings:
    driver.get(base + building)
    driver.refresh()
    WebDriverWait(driver, 20).until(
        EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "tr[s25-ng-dnd-sortable-item]")
        )
    )
    page_buttons = driver.find_elements(By.CSS_SELECTOR, "div.pages button")
    num_pages = len(page_buttons)

    for i in range(1, num_pages + 1):
        page_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, f"div.pages button[aria-label='Page {i}']")
            )
        )
        safe_click_element(driver, page_button)

        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located(
                (By.CSS_SELECTOR, "tr[s25-ng-dnd-sortable-item]")
            )
        )
        rooms = driver.find_elements(
            By.CSS_SELECTOR, "tr[s25-ng-dnd-sortable-item]")

        for room in rooms:
            try:
                room_data = {
                    "rid": str(uuid.uuid4()),
                    "room_name": WebDriverWait(room, 10)
                    .until(
                        EC.presence_of_element_located(
                            (By.CSS_SELECTOR,
                             "td[data-label='Name'] .s25-item-name")
                        )
                    )
                    .text,
                    "formal_name": None,
                    "max_capacity": None,
                    "features": None,
                }

                try:
                    room_data["formal_name"] = room.find_element(
                        By.CSS_SELECTOR, "td[data-label='Formal Name'] span"
                    ).text
                except NoSuchElementException:
                    pass

                try:
                    max_capacity_text = room.find_element(
                        By.CSS_SELECTOR, "td[data-label='Max Capacity'] span"
                    ).text
                    room_data["max_capacity"] = (
                        int(max_capacity_text) if max_capacity_text.isdigit() else None
                    )
                except NoSuchElementException:
                    pass

                try:
                    room_data["features"] = room.find_element(
                        By.CSS_SELECTOR, "td[data-label='Features'] span"
                    ).text
                except NoSuchElementException:
                    pass

                insert_room_data(conn, room_data)
            except Exception as e:
                print(f"An error occurred while processing room data: {e}")

driver.quit()
conn.close()
