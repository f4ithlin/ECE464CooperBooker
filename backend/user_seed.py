from sqlalchemy import create_engine, Column, String, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

engine = create_engine(
    "postgresql://postgres:antfarm@localhost/cooperbookerdb")
Session = sessionmaker(bind=engine)
session = Session()
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    uid = Column(String(255), primary_key=True)
    user_name = Column(String(255), nullable=False, unique=False)
    password = Column(String(255), nullable=False)
    access_type = Column(
        Enum(
            "student",
            "faculty",
            "staff",
            "administrator",
            name="enum_users_access_type",
        ),
        nullable=False,
    )
    email = Column(String(255), unique=True, nullable=False)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)


users_data = [
    {
        "user_name": "25Live",
        "password": "cooperbooker",
        "access_type": "administrator",
        "email": "25live@cooper.edu",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    },
    {
        "user_name": "carl.sable",
        "password": "cooperbooker",
        "access_type": "faculty",
        "email": "csable@cooper.edu",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    },
    {
        "user_name": "yuri.hu",
        "password": "cooperbooker",
        "access_type": "student",
        "email": "yuri.hu@cooper.edu",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    },
    {
        "user_name": "faith.lin",
        "password": "cooperbooker",
        "access_type": "student",
        "email": "faith.lin@cooper.edu",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    },
]

for user_data in users_data:
    user = User(uid=str(uuid.uuid4()), **user_data)
    session.add(user)

session.commit()
print("Users created successfully.")
