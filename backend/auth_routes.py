import os
from urllib.parse import quote

from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse

from oauth import oauth
from database import get_db
from models import User
from auth import create_access_token

router = APIRouter()

# Where the dashboard lives; the browser is sent back here after Google sign-in.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


@router.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/callback", name="auth_callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    google_user = token["userinfo"]

    user = db.query(User).filter(
        User.google_id == google_user["sub"]
    ).first()

    if not user:
        user = User(
            google_id=google_user["sub"],
            email=google_user["email"],
            name=google_user.get("name"),
            picture=google_user.get("picture"),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email
        }
    )

    redirect_url = (
        f"{FRONTEND_URL}/?access_token={access_token}"
        f"&name={quote(user.name or '')}"
        f"&email={quote(user.email or '')}"
        f"&picture={quote(user.picture or '')}"
    )
    return RedirectResponse(url=redirect_url)
