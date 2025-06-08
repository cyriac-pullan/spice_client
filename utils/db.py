import os
from pymongo import MongoClient

_db = None

def init_db():
    global _db
    if _db is None:
        mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/delispi_test')
        client = MongoClient(mongo_uri)
        # Extract database name from URI
        db_name = mongo_uri.split('/')[-1]
        _db = client[db_name]
    return _db

def get_db():
    global _db
    if _db is None:
        _db = init_db()
    return _db
