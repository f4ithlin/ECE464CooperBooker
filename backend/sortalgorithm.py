import pandas as pd
from sqlalchemy import create_engine, text
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.cluster import DBSCAN


def connect_to_database():
    db_username = "postgres"
    db_password = "antfarm"
    db_host = "34.86.116.48"
    db_port = "5432"
    db_name = "cooperbookerdb"
    connection_string = (
        f"postgresql://{db_username}:{db_password}@{db_host}:{db_port}/{db_name}"
    )
    engine = create_engine(connection_string)
    return engine


def fetch_data():
    engine = connect_to_database()
    query = "SELECT * FROM processed_events;"
    df = pd.read_sql(query, engine)
    return df


def preprocess_and_cluster(df):
    df["start_time_min"] = df["starttime"].apply(
        lambda t: t.hour * 60 + t.minute)
    df["end_time_min"] = df["endtime"].apply(lambda t: t.hour * 60 + t.minute)
    days = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
        "Saturday": 6,
        "Sunday": 7,
    }
    df["day_of_week_num"] = df["day_of_week"].map(days)

    df_with_courseid = df.dropna(subset=["course_id"]).copy()
    df_without_courseid = df[df["course_id"].isnull()].copy()

    if not df_with_courseid.empty:
        le_course = LabelEncoder()
        df_with_courseid["cluster_id"] = le_course.fit_transform(
            df_with_courseid["event_name"]
        )

    if not df_without_courseid.empty:
        le_no_course = LabelEncoder()
        df_without_courseid["event_id"] = le_no_course.fit_transform(
            df_without_courseid["event_name"]
        )
        max_cluster_id = (
            df_with_courseid["cluster_id"].max(
            ) if not df_with_courseid.empty else 0
        )
        features = df_without_courseid[
            ["event_id", "day_of_week_num", "start_time_min", "end_time_min"]
        ].dropna()

        if not features.empty:
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            clustering = DBSCAN(eps=0.5, min_samples=5).fit(features_scaled)
            df_without_courseid["cluster_id"] = clustering.labels_ + \
                max_cluster_id + 2
        else:
            df_without_courseid["cluster_id"] = -1

    df_combined = pd.concat(
        [df_with_courseid, df_without_courseid], ignore_index=True)
    return df_combined


def update_processed_events(df):
    engine = connect_to_database()
    # Using a context manager to ensure the connection is closed after use
    with engine.connect() as connection:
        connection.execute(
            text(
                "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS cluster_id INTEGER;"
            )
        )
        # Commit the DDL statement to ensure it's executed before further operations
        connection.commit()

        # Using a transaction block to handle updates
        with connection.begin() as transaction:
            try:
                for index, row in df.iterrows():
                    update_stmt = text(
                        """
                        UPDATE processed_events
                        SET cluster_id = :cluster_id
                        WHERE eid = :eid;
                    """
                    )
                    connection.execute(
                        update_stmt,
                        {"cluster_id": row["cluster_id"], "eid": row["eid"]},
                    )
                transaction.commit()
                print("Processed events updated with cluster information.")
            except:
                transaction.rollback()
                raise


def update_events_table(df):
    engine = connect_to_database()

    # Ensure the cluster_id column exists in the events table
    with engine.connect() as connection:
        connection.execute(
            text(
                "ALTER TABLE events_clustered ADD COLUMN IF NOT EXISTS cluster_id INTEGER;"
            )
        )

    # SQL Statement to update cluster_id
    update_stmt = text(
        """
        UPDATE events_clustered
        SET cluster_id = :cluster_id
        WHERE eid = :eid;
    """
    )

    # Execute updates
    with engine.connect() as connection:
        with connection.begin() as transaction:
            try:
                # Iterate over the DataFrame rows
                for index, row in df.iterrows():
                    # Update each row's cluster_id based on eid
                    if pd.notna(row["cluster_id"]):
                        connection.execute(
                            update_stmt,
                            {"cluster_id": int(
                                row["cluster_id"]), "eid": row["eid"]},
                        )
                transaction.commit()
            except Exception as e:
                transaction.rollback()
                print("Failed to update events table:", e)
                raise
    print("Events table updated with cluster information.")


def extract_and_insert_key_details():
    engine = connect_to_database()
    query = """
    SELECT cluster_id, day_of_week, starttime, COUNT(*) as count
    FROM processed_events
    GROUP BY cluster_id, day_of_week, starttime
    ORDER BY cluster_id, count DESC;
    """
    df = pd.read_sql(query, engine)
    df["total_count"] = df.groupby("cluster_id")["count"].transform("sum")
    df["consistency"] = df["count"] / df["total_count"]
    threshold = 0.2
    significant_patterns = df[df["consistency"] >= threshold]
    significant_patterns.to_sql(
        "cluster_key_details", con=engine, if_exists="replace", index=False
    )
    print("Key details inserted into the 'cluster_key_details' table.")


def main():
    df = fetch_data()
    df_clustered = preprocess_and_cluster(df)
    update_processed_events(df_clustered)
    update_events_table(df_clustered)
    extract_and_insert_key_details()


if __name__ == "__main__":
    main()
