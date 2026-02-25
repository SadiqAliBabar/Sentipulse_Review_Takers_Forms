from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)

async def save_reviews(reviews_data: list, db_name: str = None, collection_name: str = None):
    """Inserts multiple review records into MongoDB."""
    if not reviews_data:
        return 0
    db = client[db_name or settings.DATABASE_NAME]
    result = await db[collection_name or settings.COLLECTION_NAME].insert_many(reviews_data)
    return len(result.inserted_ids)

async def get_all_reviews(db_name: str = None, collection_name: str = None):
    """Fetches all review records from MongoDB."""
    db = client[db_name or settings.DATABASE_NAME]
    cursor = db[collection_name or settings.COLLECTION_NAME].find({}, {"_id": 0})
    return await cursor.to_list(length=None)
