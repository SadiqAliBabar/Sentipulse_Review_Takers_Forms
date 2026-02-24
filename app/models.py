from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import datetime

class ReviewRecord(BaseModel):
    Brand_Name: str = Field("Sweet Affairs", alias="brand_name")
    Branch_Name: str = Field("Sweet Affairs", alias="branch_name")
    User: str = Field(..., min_length=1, alias="user")
    Rating: Optional[int] = Field(None, ge=1, le=5, alias="rating")
    Text: Optional[str] = Field(None, alias="text")
    Date: datetime = Field(default_factory=datetime.now, alias="date")
    Source: str = Field("Manual", alias="source")

    @model_validator(mode='after')
    def check_rating_or_text(self) -> 'ReviewRecord':
        if not self.Rating and (not self.Text or len(self.Text.strip()) == 0):
            raise ValueError('Either Rating or Text must be provided (Not Enough Data)')
        return self

    Address: Optional[str] = Field("Sweet Affairs Location", alias="address")
    Review_URL: Optional[str] = Field(None, alias="review_url")
    INHOUSE_Reviewer_Contact: Optional[str] = Field(None, pattern=r'^\d{10,15}$')
    INHOUSE_Reviewer_EmailID: Optional[str] = Field(None, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

    INHOUSE_Rating_Food: Optional[int] = Field(None, ge=1, le=5)
    INHOUSE_Rating_Drinks: Optional[int] = Field(None, ge=1, le=5)
    INHOUSE_Rating_Service: Optional[int] = Field(None, ge=1, le=5)
    INHOUSE_Rating_Cleanliness: Optional[int] = Field(None, ge=1, le=5)
    INHOUSE_Rating_Ambiance: Optional[int] = Field(None, ge=1, le=5)
    INHOUSE_Rating_Price: Optional[int] = Field(None, ge=1, le=5)

    INHOUSE_Selection_Food: Optional[List[str]] = None
    INHOUSE_Selection_Drinks: Optional[List[str]] = None
    INHOUSE_Selection_Service: Optional[List[str]] = None
    INHOUSE_Selection_Cleanliness: Optional[List[str]] = None
    INHOUSE_Selection_Ambiance: Optional[List[str]] = None
    INHOUSE_Selection_Price: Optional[List[str]] = None

    model_config = {
        "populate_by_name": True,
        "extra": "ignore"
    }
