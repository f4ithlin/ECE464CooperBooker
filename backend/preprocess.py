import pandas as pd
from sqlalchemy import create_engine


def connect_to_postgres():
    try:
        engine = create_engine(
            "postgresql://postgres:antfarm@34.86.116.48/cooperbookerdb"
        )
        print("Connection to PostgreSQL DB successful")
        return engine
    except Exception as e:
        print(f"The error '{e}' occurred")
        return None


def fetch_data():
    engine = connect_to_postgres()
    if engine is not None:
        try:
            query = """
            SELECT eid, event_name, date, starttime, endtime, rid 
            FROM events;
            """
            events_df = pd.read_sql(query, con=engine)
            return events_df
        except Exception as e:
            print(f"An error occurred: {e}")
            return None


def preprocess_data(df):
    df["date"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["date"].dt.day_name()
    df["time_slot"] = df["starttime"].astype(
        str) + "-" + df["endtime"].astype(str)
    # Updated regex with non-capturing groups for decimals and sections
    df["course_id"] = df["event_name"].str.extract(
        r"([A-Z]{2,4}\s+\d{2,3}(?:\.\d)?\s*(?:[A-Z]|\d)?)"
    )
    df["course_id"] = df["course_id"].str.strip()  # Clean any trailing spaces
    return df


def write_data_to_db(df, table_name):
    engine = connect_to_postgres()
    if engine is not None:
        df.to_sql(table_name, engine, if_exists="replace", index=False)
        print(
            f"Data written to table {table_name} in the database successfully.")


def main():
    data = fetch_data()
    if data is not None:
        processed_data = preprocess_data(data)
        write_data_to_db(processed_data, "processed_events")


if __name__ == "__main__":
    main()
