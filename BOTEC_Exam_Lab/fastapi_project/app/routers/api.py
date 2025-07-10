from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

@router.get("/")
def read_root():
    return {"Hello": "World"}

@router.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

@router.post("/items/")
def create_item(item: Item):
    return item