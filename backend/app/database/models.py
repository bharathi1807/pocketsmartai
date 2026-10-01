from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    recommendations = relationship(
        "RecommendationHistory",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(RecommendationHistory.created_at)"
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    planner_type = Column(String(50), nullable=False, index=True)  # 'home', 'party', 'jewelry'
    request_data = Column(JSON, nullable=False)
    response_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationship
    user = relationship("User", back_populates="recommendations")

    def __repr__(self):
        return f"<RecommendationHistory id={self.id} planner={self.planner_type} user_id={self.user_id}>"
