from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)
database = client[settings.DATABASE_NAME]

async def save_reviews(reviews_data: list, collection_override: str = None):
    """Inserts multiple review records into MongoDB."""
    if not reviews_data:
        return 0
    target_collection = database[collection_override or settings.COLLECTION_NAME]
    result = await target_collection.insert_many(reviews_data)
    return len(result.inserted_ids)

async def get_all_reviews(collection_override: str = None):
    """Fetches all review records from MongoDB."""
    target_collection = database[collection_override or settings.COLLECTION_NAME]
    cursor = target_collection.find({}, {"_id": 0})
    return await cursor.to_list(length=None)
