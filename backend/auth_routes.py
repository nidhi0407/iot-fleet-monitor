from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session

from fastapi.responses import RedirectResponse

from oauth import oauth
from database import get_db
from models import User
from auth import create_access_token

router = APIRouter()


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
            name=google_user["name"],
            picture=google_user["picture"]
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

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }