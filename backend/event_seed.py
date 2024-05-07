import requests
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
import uuid


def get_room_id(conn, room_name):
    with conn.cursor() as cur:
        cur.execute("SELECT rid FROM rooms WHERE room_name = %s", (room_name,))
        result = cur.fetchone()
        return result[0] if result else None


def get_user_id(conn, user_name):
    with conn.cursor() as cur:
        cur.execute("SELECT uid FROM users WHERE user_name = %s", (user_name,))
        result = cur.fetchone()
        return result[0] if result else None


def generate_week_ranges(start_date, end_date):
    current_start_date = start_date
    while current_start_date < end_date:
        current_end_date = current_start_date + \
            timedelta(days=6)  # A week has 7 days
        yield current_start_date, current_end_date
        current_start_date = current_end_date + timedelta(days=1)


def connect_to_postgres():
    conn = psycopg2.connect(
        "dbname='cooperbookerdb' user='postgres' password='antfarm' host='localhost'"
    )
    return conn


def fetch_events_for_space_id_and_week(
    conn, base_url, headers, params_base, start_dt, end_dt, space_id, user_uid
):
    params = params_base.copy()
    params.update(
        {
            "start_dt": start_dt.strftime("%Y-%m-%d"),
            "end_dt": end_dt.strftime("%Y-%m-%d"),
            "space_id": space_id,
        }
    )

    response = requests.get(base_url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        events = data.get("root", {}).get("events", [])
        event_data_to_insert = []
        for event in events:
            rsrvs = event.get("rsrv", [])
            for rsrv in rsrvs:
                room_name = (
                    rsrv.get("subject")[0].get("itemName")
                    if rsrv.get("subject")
                    else None
                )
                room_id = get_room_id(conn, room_name)
                new_eid = str(uuid.uuid4())

                event_details = {
                    "eid": new_eid,
                    "event_name": rsrv.get("event_name"),
                    "date": datetime.strptime(
                        event.get("date").split("T")[0], "%Y-%m-%d"
                    ).date(),
                    "starttime": datetime.strptime(
                        rsrv.get("rsrv_start_dt"), "%Y-%m-%dT%H:%M:%S"
                    ).time(),
                    "endtime": datetime.strptime(
                        rsrv.get("rsrv_end_dt"), "%Y-%m-%dT%H:%M:%S"
                    ).time(),
                    "profile_name": rsrv.get("profile_name"),
                    "rid": room_id,
                    "uid": user_uid,  # Placeholder for userId
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now(),
                }
                event_data_to_insert.append(event_details)

        with conn.cursor() as cur:
            query = """
                INSERT INTO events (eid, event_name, date, starttime, endtime, profile_name, "rid", "uid", "createdAt", "updatedAt")
                VALUES %s
            """
            execute_values(
                cur,
                query,
                [
                    (
                        event["eid"],
                        event["event_name"],
                        event["date"],
                        event["starttime"],
                        event["endtime"],
                        event["profile_name"],
                        event["rid"],
                        event["uid"],
                        event["createdAt"],
                        event["updatedAt"],
                    )
                    for event in event_data_to_insert
                ],
            )
            conn.commit()
            print(
                f"Inserted {len(event_data_to_insert)} events into PostgreSQL")
    else:
        print(
            f"Failed to fetch data for Space ID {space_id} from {start_dt} to {end_dt}. Status code: {response.status_code}"
        )


conn = connect_to_postgres()
user_uid = get_user_id(conn, "25Live")


headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Cookie": "_ga=GA1.1.967931303.1711314393; _ga_G00QPYZT4F=GS1.1.1711314392.1.0.1711314401.0.0.0; Blaze=ZiHMJXN8Yaj0IeA1SoWdPgAeWQE; dtCookie=v_4_srv_1_sn_59F65E0981553231CA1686D9DBD5929A_perc_100000_ol_0_mul_1_app-3A1163e2691a52ad25_0; BIGipServerp-java.25live-web.collegenet.com=185861898.36895.0000; WSSESSIONID=F44F73F3CD86030C6A97F0C63A659298; BIGipServerp-web.25live-web.collegenet.com=187172618.20480.0000",  # Be cautious with sensitive information
    "Referer": "https://25live.collegenet.com/pro/cooper",
}

base_url = "https://25live.collegenet.com/25live/data/cooper/run/home/calendar/calendardata.json"
params_base = {
    "mode": "pro",
    "obj_cache_accl": 0,
    "comptype": "cal_location",
    "sort": "evdates_event_name",
    "compsubject": "location",
    "state": "0+1+3+4+99",
    "caller": "pro-CalendarService.getData",
}


start_period = datetime.strptime("2024-01-14", "%Y-%m-%d")
end_period = datetime.strptime("2024-05-10", "%Y-%m-%d")

for start_dt, end_dt in generate_week_ranges(start_period, end_period):
    for space_id in range(91, 144):  # 1-87, 91-144
        fetch_events_for_space_id_and_week(
            conn, base_url, headers, params_base, start_dt, end_dt, space_id, user_uid
        )
