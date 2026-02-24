from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.models import ReviewRecord
from app.database import save_reviews, get_all_reviews
from app.config import settings
from typing import List, Optional
import pandas as pd
from io import BytesIO
from datetime import datetime

router = APIRouter()

@router.post("/submit-reviews")
async def submit_reviews(
    reviews: List[ReviewRecord], 
    collection: Optional[str] = Query(None, description="Optional collection name override")
):
    try:
        # Convert Pydantic models to dicts using aliases (lowercase) for MongoDB
        reviews_dicts = [review.model_dump(by_alias=True) for review in reviews]
        
        # Save to database
        count = await save_reviews(reviews_dicts, collection_override=collection)
        
        return {
            "status": "success",
            "message": f"Successfully saved {count} reviews!",
            "count": count
        }
    except Exception as e:
        print(f"Error saving reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit-survey")
async def submit_survey(review: ReviewRecord):
    try:
        # Save a single review (from QR form) using aliases (lowercase)
        count = await save_reviews([review.model_dump(by_alias=True)], collection_override=settings.COLLECTION_NAME)
        return {"status": "success", "message": "Feedback received!", "count": count}
    except Exception as e:
        print(f"Error saving survey: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories():
    # Basic categories for the QR form
    return {
        "categories": ["Food", "Drinks", "Service", "Cleanliness", "Ambiance", "Price"],
        "branch_name": "SentiPulse Branch",
        "questions": {
            "food": {
                "negative": { "question": "What went wrong?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "positive": { "question": "What did you love?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] }
            },
            "drinks": {
                "negative": { "question": "What went wrong?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] },
                "positive": { "question": "What did you love?", "options": ["Quality/Taste", "Quantity/Portion Size", "Temperature", "Presentation", "Hygiene"] }
            },
            "service": {
                "negative": { "question": "What went wrong?", "options": ["Order Taking Time", "Order Serving Time", "Order Accuracy", "Staff Behavior", "Staff Hygiene", "Staff Menu Knowledge"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Order Taking Time", "Order Serving Time", "Order Accuracy", "Staff Behavior", "Staff Hygiene", "Staff Menu Knowledge"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Order Taking Time", "Order Serving Time", "Order Accuracy", "Staff Behavior", "Staff Hygiene", "Staff Menu Knowledge"] },
                "positive": { "question": "What did you love?", "options": ["Order Taking Time", "Order Serving Time", "Order Accuracy", "Staff Behavior", "Staff Hygiene", "Staff Menu Knowledge"] }
            },
            "cleanliness": {
                "negative": { "question": "What went wrong?", "options": ["Dining Area", "Waiting/Ordering Area", "Parking Area", "Washrooms"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Dining Area", "Waiting/Ordering Area", "Parking Area", "Washrooms"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Dining Area", "Waiting/Ordering Area", "Parking Area", "Washrooms"] },
                "positive": { "question": "What did you love?", "options": ["Dining Area", "Waiting/Ordering Area", "Parking Area", "Washrooms"] }
            },
            "ambiance": {
                "negative": { "question": "What went wrong?", "options": ["Lighting", "Music/Volume", "Temperature", "Fragrance/Smell"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Lighting", "Music/Volume", "Temperature", "Fragrance/Smell"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Lighting", "Music/Volume", "Temperature", "Fragrance/Smell"] },
                "positive": { "question": "What did you love?", "options": ["Lighting", "Music/Volume", "Temperature", "Fragrance/Smell"] }
            },
            "price": {
                "negative": { "question": "What went wrong?", "options": ["Value For Money", "Billing Accuracy", "Payment Mode"] },
                "neutral": { "question": "What needs to be improved?", "options": ["Value For Money", "Billing Accuracy", "Payment Mode"] },
                "improvement": { "question": "Improvement in what will make it 5-star?", "options": ["Value For Money", "Billing Accuracy", "Payment Mode"] },
                "positive": { "question": "What did you love?", "options": ["Value For Money", "Billing Accuracy", "Payment Mode"] }
            }
        }
    }

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.get("/export-reviews")
async def export_reviews(collection: Optional[str] = Query(None)):
    try:
        # Fetch data from MongoDB
        data = await get_all_reviews(collection_override=collection)
        
        if not data:
            raise HTTPException(status_code=404, detail="No reviews found to export.")
            
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # FIX: Ensure datetimes are timezone-unaware for Excel
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].dt.tz_localize(None)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Reviews')
        
        output.seek(0)
        
        # Return as downloadable file
        filename = f"Reviews_Export_{settings.COLLECTION_NAME}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        print(f"Error exporting reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-current")
async def export_current(reviews: List[ReviewRecord]):
    try:
        processed_data = []
        
        # Mapping for human-readable column names matching form labels
        field_mapping = {
            "user": "Reviewer Name",
            "INHOUSE_Reviewer_Contact": "Phone Number",
            "INHOUSE_Reviewer_EmailID": "Email ID",
            "source": "Input Category",
            "rating": "Overall Experience",
            "text": "Review Text",
            "INHOUSE_Rating_Food": "Food",
            "INHOUSE_Rating_Drinks": "Drink",
            "INHOUSE_Rating_Service": "Service",
            "INHOUSE_Rating_Cleanliness": "Cleanliness",
            "INHOUSE_Rating_Ambiance": "Ambiance",
            "INHOUSE_Rating_Price": "Price"
        }

        for review in reviews:
            # Get the flat dictionary using aliases (lowercase)
            rev_dict = review.model_dump(by_alias=True)
            
            # Create a new row with human-readable names
            row = {
                "DATE": review.Date.strftime("%Y-%m-%d"),
                "TIME": review.Date.strftime("%H:%M")
            }
            
            # Add the rest of the fields
            for alias, label in field_mapping.items():
                row[label] = rev_dict.get(alias)
            
            processed_data.append(row)
            
        # Convert to DataFrame
        df = pd.DataFrame(processed_data)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Current_Reviews')
            
            # Auto-adjust column widths for better readability
            worksheet = writer.sheets['Current_Reviews']
            for i, col in enumerate(df.columns):
                # Ensure we handle nulls and non-string types for length calculation
                # Map everything to string and handle None as empty string
                column_data = df[col].fillna("").astype(str)
                
                # Find maximum length: max of all content strings or the header name
                content_max = column_data.map(len).max() if not column_data.empty else 0
                header_max = len(str(col))
                
                max_len = max(content_max, header_max) + 4 # Add padding
                
                # Limit width for 'Review Text' so it doesn't get ridiculously wide
                if col == "Review Text":
                    max_len = min(max_len, 60)
                
                # Set the column width
                column_letter = chr(65 + i) if i < 26 else f"{chr(64 + i // 26)}{chr(65 + i % 26)}"
                worksheet.column_dimensions[column_letter].width = max_len
        
        output.seek(0)
        
        filename = f"Reviews_Form_Export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        headers = { 'Content-Disposition': f'attachment; filename="{filename}"' }
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        print(f"Error exporting current reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))
