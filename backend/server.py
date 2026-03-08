from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import feedparser
import asyncio
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-c161dD00664D4C02e7')

# Create the main app
app = FastAPI(title="EcoPonto BR API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    points: int = 0
    level: int = 1
    total_kg_collected: float = 0.0
    total_co2_saved: float = 0.0
    role: str = "user"  # user, school, admin
    city: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CollectionPoint(BaseModel):
    point_id: str
    name: str
    latitude: float
    longitude: float
    address: str
    city: str
    state: str
    types_accepted: List[str]  # plastic, paper, glass, metal, electronic, organic
    capacity_percentage: int = 0  # 0-100
    is_school: bool = False
    school_id: Optional[str] = None
    contact: Optional[str] = None
    hours: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Delivery(BaseModel):
    delivery_id: str
    user_id: str
    point_id: str
    waste_type: str  # plastic, paper, glass, metal, electronic, organic
    weight_kg: float
    photo_base64: str
    points_earned: int
    co2_saved_kg: float
    confidence: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class School(BaseModel):
    school_id: str
    name: str
    cnpj: Optional[str] = None
    address: str
    city: str
    state: str
    contact_email: str
    total_kg_collected: float = 0.0
    total_points: int = 0
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsArticle(BaseModel):
    article_id: str
    title: str
    description: str
    url: str
    source: str
    image_url: Optional[str] = None
    published_at: datetime
    category: str  # deforestation, recycling, climate, wildlife
    state: Optional[str] = None
    cached_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Challenge(BaseModel):
    challenge_id: str
    title: str
    description: str
    goal: int  # kg or deliveries
    reward_points: int
    start_date: datetime
    end_date: datetime
    active: bool = True

class RankingEntry(BaseModel):
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    points: int
    total_kg: float
    level: int
    rank: int

# ==================== AUTH HELPER ====================

async def get_current_user(request: Request) -> Optional[User]:
    """Extract user from session token (cookie or Authorization header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        return None
    
    # Find session
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        return None
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== AUTH ROUTES ====================

@api_router.get("/auth/google-login")
async def google_login(request: Request):
    """Redirect to Emergent Google OAuth"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    base_url = str(request.base_url).rstrip('/')
    redirect_url = f"{base_url}/api/auth/callback"
    auth_url = f"https://auth.emergentagent.com/?redirect={redirect_url}"
    return RedirectResponse(url=auth_url)

@api_router.get("/auth/callback")
async def auth_callback(request: Request, response: Response, session_id: str = None):
    """Handle OAuth callback"""
    try:
        # Get session_id from query params
        if not session_id:
            # Try to get from request
            session_id = request.query_params.get('session_id')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")
        
        # Exchange session_id for session_token
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Invalid session")
                data = await resp.json()
        
        # Create or update user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": data["name"],
                    "picture": data.get("picture")
                }}
            )
        else:
            new_user = User(
                user_id=user_id,
                email=data["email"],
                name=data["name"],
                picture=data.get("picture")
            )
            await db.users.insert_one(new_user.dict())
        
        # Create session
        session_token = data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        user_session = UserSession(
            user_id=user_id,
            session_token=session_token,
            expires_at=expires_at
        )
        await db.user_sessions.insert_one(user_session.dict())
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        # Redirect to auth-callback page in frontend
        base_url = str(request.base_url).rstrip('/')
        frontend_callback = f"{base_url}/auth-callback?success=true"
        
        return RedirectResponse(url=frontend_callback)
        
    except Exception as e:
        logger.error(f"Auth callback error: {e}")
        # Redirect to login with error
        base_url = str(request.base_url).rstrip('/')
        return RedirectResponse(url=f"{base_url}/login?error=auth_failed")

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current user"""
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"success": True}

# ==================== COLLECTION POINTS ====================

@api_router.get("/collection-points")
async def get_collection_points(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    waste_type: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 50
):
    """Get collection points with optional filters"""
    query = {}
    if waste_type:
        query["types_accepted"] = waste_type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    points = await db.collection_points.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    # If lat/lng provided, calculate distance (simple approximation)
    if latitude is not None and longitude is not None:
        for point in points:
            lat_diff = point["latitude"] - latitude
            lng_diff = point["longitude"] - longitude
            distance_km = ((lat_diff**2 + lng_diff**2) ** 0.5) * 111  # rough conversion
            point["distance_km"] = round(distance_km, 2)
        points.sort(key=lambda x: x.get("distance_km", 9999))
    
    return points

@api_router.post("/collection-points")
async def create_collection_point(point_data: dict, user: User = Depends(require_auth)):
    """Create a collection point"""
    if user.role not in ["admin", "school"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    point_id = f"point_{uuid.uuid4().hex[:12]}"
    
    point = CollectionPoint(
        point_id=point_id,
        name=point_data["name"],
        latitude=point_data["latitude"],
        longitude=point_data["longitude"],
        address=point_data["address"],
        city=point_data["city"],
        state=point_data["state"],
        types_accepted=point_data.get("types_accepted", ["plastic", "paper", "glass", "metal"]),
        is_school=user.role == "school",
        contact=point_data.get("contact"),
        hours=point_data.get("hours")
    )
    
    await db.collection_points.insert_one(point.dict())
    return point

# ==================== DELIVERIES ====================

@api_router.post("/deliveries")
async def create_delivery(delivery_data: dict, user: User = Depends(require_auth)):
    """Register a waste delivery with AI classification"""
    try:
        photo_base64 = delivery_data["photo_base64"]
        point_id = delivery_data["point_id"]
        weight_kg = float(delivery_data.get("weight_kg", 1.0))
        
        # Classify waste using Gemini Vision
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify_{uuid.uuid4().hex[:8]}",
            system_message="You are a waste classification expert. Classify the waste in the image into one of these categories: plastic, paper, glass, metal, electronic, organic. Respond with ONLY the category name in lowercase."
        ).with_model("gemini", "gemini-2.5-pro")
        
        image_content = ImageContent(image_base64=photo_base64)
        user_message = UserMessage(
            text="Classify this waste. Respond with only one word: plastic, paper, glass, metal, electronic, or organic.",
            file_contents=[image_content]
        )
        
        classification_result = await chat.send_message(user_message)
        waste_type = classification_result.lower().strip()
        
        # Validate classification
        valid_types = ["plastic", "paper", "glass", "metal", "electronic", "organic"]
        if waste_type not in valid_types:
            # Try to extract from response
            for vtype in valid_types:
                if vtype in waste_type:
                    waste_type = vtype
                    break
            else:
                waste_type = "plastic"  # default
        
        # Calculate points based on waste type and weight
        points_multiplier = {
            "plastic": 10,
            "paper": 8,
            "glass": 12,
            "metal": 15,
            "electronic": 20,
            "organic": 5
        }
        points_earned = int(weight_kg * points_multiplier.get(waste_type, 10))
        
        # Calculate CO2 saved (simplified formula)
        co2_multiplier = {
            "plastic": 1.5,
            "paper": 0.8,
            "glass": 0.3,
            "metal": 2.0,
            "electronic": 3.0,
            "organic": 0.2
        }
        co2_saved_kg = weight_kg * co2_multiplier.get(waste_type, 1.0)
        
        # Create delivery record
        delivery_id = f"delivery_{uuid.uuid4().hex[:12]}"
        delivery = Delivery(
            delivery_id=delivery_id,
            user_id=user.user_id,
            point_id=point_id,
            waste_type=waste_type,
            weight_kg=weight_kg,
            photo_base64=photo_base64,
            points_earned=points_earned,
            co2_saved_kg=co2_saved_kg,
            confidence=0.85
        )
        
        await db.deliveries.insert_one(delivery.dict())
        
        # Update user stats
        new_points = user.points + points_earned
        new_total_kg = user.total_kg_collected + weight_kg
        new_co2_saved = user.total_co2_saved + co2_saved_kg
        new_level = 1 + (new_points // 1000)  # Level up every 1000 points
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "points": new_points,
                "total_kg_collected": new_total_kg,
                "total_co2_saved": new_co2_saved,
                "level": new_level
            }}
        )
        
        return {
            "success": True,
            "delivery": delivery.dict(),
            "user_stats": {
                "points": new_points,
                "level": new_level,
                "total_kg": new_total_kg,
                "total_co2_saved": new_co2_saved
            }
        }
        
    except Exception as e:
        logger.error(f"Delivery creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/deliveries")
async def get_user_deliveries(user: User = Depends(require_auth), limit: int = 50):
    """Get user's delivery history"""
    deliveries = await db.deliveries.find(
        {"user_id": user.user_id},
        {"_id": 0, "photo_base64": 0}  # Exclude photo for performance
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return deliveries

@api_router.get("/deliveries/{delivery_id}")
async def get_delivery_detail(delivery_id: str, user: User = Depends(require_auth)):
    """Get delivery details with photo"""
    delivery = await db.deliveries.find_one({"delivery_id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if delivery["user_id"] != user.user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return delivery

# ==================== NEWS ====================

RSS_FEEDS = {
    "ibama": "https://www.gov.br/ibama/pt-br/assuntos/noticias/rss.xml",
    "mma": "https://www.gov.br/mma/pt-br/assuntos/noticias/rss.xml",
    "agencia_brasil": "https://agenciabrasil.ebc.com.br/rss/meio-ambiente.xml",
    "g1_meio_ambiente": "https://g1.globo.com/meio-ambiente/rss2.xml",
    "g1_natureza": "https://g1.globo.com/natureza/desafio-natureza/rss.xml",
    "oeco": "https://oeco.org.br/feed/",
}

async def fetch_news_from_rss():
    """Fetch and cache news from RSS feeds"""
    try:
        all_articles = []
        
        for source_name, feed_url in RSS_FEEDS.items():
            try:
                feed = await asyncio.to_thread(feedparser.parse, feed_url)
                
                for entry in feed.entries[:10]:  # Get 10 most recent from each
                    article_id = f"news_{uuid.uuid4().hex[:12]}"
                    
                    # Parse published date
                    published_at = datetime.now(timezone.utc)
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        import time
                        published_at = datetime.fromtimestamp(
                            time.mktime(entry.published_parsed),
                            tz=timezone.utc
                        )
                    
                    # Categorize based on keywords
                    title_lower = entry.title.lower()
                    description_lower = entry.get('description', '').lower()
                    summary_lower = entry.get('summary', '').lower()
                    content = title_lower + " " + description_lower + " " + summary_lower
                    
                    category = "climate"
                    if any(word in content for word in ["desmatamento", "floresta", "amazônia", "cerrado", "mata", "árvore", "devastação", "queimada"]):
                        category = "deforestation"
                    elif any(word in content for word in ["reciclagem", "lixo", "resíduo", "coleta", "sustentável", "descarte", "reutilização"]):
                        category = "recycling"
                    elif any(word in content for word in ["fauna", "animal", "espécie", "biodiversidade", "vida selvagem", "extinção", "preservação"]):
                        category = "wildlife"
                    elif any(word in content for word in ["clima", "aquecimento", "emissão", "carbono", "temperatura", "meteorologia"]):
                        category = "climate"
                    
                    article = NewsArticle(
                        article_id=article_id,
                        title=entry.title,
                        description=entry.get('description', entry.title)[:500],
                        url=entry.link,
                        source=source_name,
                        image_url=entry.get('media_thumbnail', [{}])[0].get('url') if 'media_thumbnail' in entry else None,
                        published_at=published_at,
                        category=category
                    )
                    all_articles.append(article)
                    
            except Exception as e:
                logger.error(f"Error fetching from {source_name}: {e}")
                continue
        
        # Save to database (replace old cache)
        if all_articles:
            await db.news.delete_many({})  # Clear old cache
            await db.news.insert_many([a.dict() for a in all_articles])
            logger.info(f"Cached {len(all_articles)} news articles")
        
        return all_articles
        
    except Exception as e:
        logger.error(f"News fetch error: {e}")
        return []

@api_router.get("/news")
async def get_news(
    category: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50
):
    """Get news articles from cache"""
    query = {}
    if category:
        query["category"] = category
    if state:
        query["state"] = state
    
    # Check if cache is fresh (less than 6 hours old)
    latest_article = await db.news.find_one({}, {"_id": 0, "cached_at": 1}, sort=[("cached_at", -1)])
    
    if latest_article:
        cached_at = latest_article["cached_at"]
        if isinstance(cached_at, str):
            cached_at = datetime.fromisoformat(cached_at)
        if cached_at.tzinfo is None:
            cached_at = cached_at.replace(tzinfo=timezone.utc)
        
        # Ensure both datetimes have timezone info
        now_utc = datetime.now(timezone.utc)
        if cached_at.tzinfo is None:
            cached_at = cached_at.replace(tzinfo=timezone.utc)
        
        if (now_utc - cached_at) > timedelta(hours=6):
            asyncio.create_task(fetch_news_from_rss())
    else:
        # No cache, fetch now
        asyncio.create_task(fetch_news_from_rss())
    
    articles = await db.news.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return articles

@api_router.post("/news/refresh")
async def refresh_news():
    """Force refresh news cache"""
    articles = await fetch_news_from_rss()
    return {"success": True, "count": len(articles)}

# ==================== RANKINGS ====================

@api_router.get("/rankings/global")
async def get_global_ranking(limit: int = 100):
    """Get global ranking"""
    users = await db.users.find(
        {},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "points": 1, "total_kg_collected": 1, "level": 1}
    ).sort("points", -1).limit(limit).to_list(limit)
    
    ranking = []
    for idx, user_data in enumerate(users, 1):
        ranking.append(RankingEntry(
            user_id=user_data["user_id"],
            user_name=user_data["name"],
            user_picture=user_data.get("picture"),
            points=user_data["points"],
            total_kg=user_data.get("total_kg_collected", 0.0),
            level=user_data["level"],
            rank=idx
        ))
    
    return ranking

@api_router.get("/rankings/city/{city}")
async def get_city_ranking(city: str, limit: int = 50):
    """Get city-specific ranking"""
    users = await db.users.find(
        {"city": {"$regex": city, "$options": "i"}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "points": 1, "total_kg_collected": 1, "level": 1}
    ).sort("points", -1).limit(limit).to_list(limit)
    
    ranking = []
    for idx, user_data in enumerate(users, 1):
        ranking.append(RankingEntry(
            user_id=user_data["user_id"],
            user_name=user_data["name"],
            user_picture=user_data.get("picture"),
            points=user_data["points"],
            total_kg=user_data.get("total_kg_collected", 0.0),
            level=user_data["level"],
            rank=idx
        ))
    
    return ranking

# ==================== CHALLENGES ====================

@api_router.get("/challenges")
async def get_challenges():
    """Get active challenges"""
    now = datetime.now(timezone.utc)
    challenges = await db.challenges.find(
        {
            "active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        },
        {"_id": 0}
    ).to_list(100)
    return challenges

# ==================== ADMIN ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(require_auth)):
    """Get admin statistics"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    total_deliveries = await db.deliveries.count_documents({})
    total_points_result = await db.collection_points.count_documents({})
    
    # Aggregate stats
    pipeline = [
        {"$group": {
            "_id": None,
            "total_kg": {"$sum": "$total_kg_collected"},
            "total_co2": {"$sum": "$total_co2_saved"}
        }}
    ]
    agg_result = await db.users.aggregate(pipeline).to_list(1)
    
    total_kg = agg_result[0]["total_kg"] if agg_result else 0
    total_co2 = agg_result[0]["total_co2"] if agg_result else 0
    
    return {
        "total_users": total_users,
        "total_deliveries": total_deliveries,
        "total_collection_points": total_points_result,
        "total_kg_collected": round(total_kg, 2),
        "total_co2_saved": round(total_co2, 2)
    }

# ==================== INIT DATA ====================

@app.on_event("startup")
async def startup_event():
    """Initialize database with sample data if empty"""
    try:
        # Create sample collection points if none exist
        count = await db.collection_points.count_documents({})
        if count == 0:
            sample_points = [
                CollectionPoint(
                    point_id=f"point_{uuid.uuid4().hex[:12]}",
                    name="EcoPonto Centro São Paulo",
                    latitude=-23.5505,
                    longitude=-46.6333,
                    address="Praça da Sé, Centro",
                    city="São Paulo",
                    state="SP",
                    types_accepted=["plastic", "paper", "glass", "metal"],
                    hours="8h-18h"
                ),
                CollectionPoint(
                    point_id=f"point_{uuid.uuid4().hex[:12]}",
                    name="Escola Municipal Verde",
                    latitude=-23.5489,
                    longitude=-46.6388,
                    address="Rua das Flores, 123",
                    city="São Paulo",
                    state="SP",
                    types_accepted=["plastic", "paper", "electronic"],
                    is_school=True,
                    hours="7h-17h"
                ),
                CollectionPoint(
                    point_id=f"point_{uuid.uuid4().hex[:12]}",
                    name="EcoPonto Copacabana",
                    latitude=-22.9688,
                    longitude=-43.1880,
                    address="Av. Atlântica, 1000",
                    city="Rio de Janeiro",
                    state="RJ",
                    types_accepted=["plastic", "paper", "glass", "metal", "organic"],
                    hours="24h"
                )
            ]
            await db.collection_points.insert_many([p.dict() for p in sample_points])
            logger.info("Inserted sample collection points")
        
        # Fetch initial news
        news_count = await db.news.count_documents({})
        if news_count == 0:
            asyncio.create_task(fetch_news_from_rss())
        
        # Create sample challenges
        challenges_count = await db.challenges.count_documents({})
        if challenges_count == 0:
            now = datetime.now(timezone.utc)
            sample_challenges = [
                Challenge(
                    challenge_id=f"challenge_{uuid.uuid4().hex[:12]}",
                    title="Primeira Entrega",
                    description="Faça sua primeira entrega de reciclagem",
                    goal=1,
                    reward_points=50,
                    start_date=now,
                    end_date=now + timedelta(days=30)
                ),
                Challenge(
                    challenge_id=f"challenge_{uuid.uuid4().hex[:12]}",
                    title="10kg em Uma Semana",
                    description="Recicle 10kg de materiais em 7 dias",
                    goal=10,
                    reward_points=200,
                    start_date=now,
                    end_date=now + timedelta(days=7)
                )
            ]
            await db.challenges.insert_many([c.dict() for c in sample_challenges])
            logger.info("Inserted sample challenges")
            
    except Exception as e:
        logger.error(f"Startup error: {e}")

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
