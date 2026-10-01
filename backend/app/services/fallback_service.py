"""Robust fallback recommendation service.

Used when the Gemini API is unavailable, unconfigured, or rate-limited,
ensuring zero user-facing service interruptions.
"""

from typing import Dict, Any, List
from app.schemas.recommendation import RecommendationResponse, RecommendationItem, BudgetSummary
from app.schemas.home import HomePlannerRequest
from app.schemas.party import PartyPlannerRequest
from app.schemas.jewelry import JewelryPlannerRequest


class FallbackService:
    @staticmethod
    def generate_home_fallback(req: HomePlannerRequest) -> RecommendationResponse:
        budget = req.total_budget
        # Allocate roughly 92% of budget across primary components
        furniture_pct = 0.52
        lighting_pct = 0.16
        fixtures_pct = 0.14
        decor_pct = 0.10

        furniture_budget = round(budget * furniture_pct, 2)
        lighting_budget = round(budget * lighting_pct, 2)
        fixtures_budget = round(budget * fixtures_pct, 2)
        decor_budget = round(budget * decor_pct, 2)
        allocated = furniture_budget + lighting_budget + fixtures_budget + decor_budget
        remaining = round(budget - allocated, 2)

        items: List[RecommendationItem] = [
            RecommendationItem(
                category="Furniture",
                name=f"{req.style_preference} Primary Seating & Core Set",
                description=f"Modular ergonomic setup tailored for {req.room_type} in {req.style_preference} finish. {req.furniture_requirements or 'Durable fabric and solid wood frame.'}",
                estimated_price=furniture_budget,
                platform="IKEA / Pepperfry",
                reason=f"Selected for high durability and compact footprint matching {req.room_type} dimensions.",
                external_search_query=f"{req.style_preference} {req.room_type} furniture"
            ),
            RecommendationItem(
                category="Lighting",
                name="Warm Ambient LED & Accent Spotlight Kit",
                description=f"Dimmable warm 3000K diffused lighting system. {req.lighting_requirements or 'Energy-efficient LED fixtures with subtle profile.'}",
                estimated_price=lighting_budget,
                platform="Philips / Amazon",
                reason="Provides layered illumination without harsh glare, reducing eye fatigue.",
                external_search_query=f"dimmable warm ambient lighting {req.style_preference}"
            ),
            RecommendationItem(
                category="Fixtures & Ventilation",
                name="BLDC Silent Ceiling Fan & Dining Accent",
                description=f"Brushless DC motor ceiling fan with aerodynamic blades. {req.ceiling_fan_requirements or 'Whisper-quiet airflow with remote regulation.'}",
                estimated_price=fixtures_budget,
                platform="Atomberg / Orient / Amazon",
                reason="Saves up to 65% energy compared to induction fans while maintaining sleek aesthetics.",
                external_search_query="bldc designer ceiling fan silent"
            ),
            RecommendationItem(
                category="Decor & Textiles",
                name="Textured Area Rug & Acoustic Curtains",
                description=f"High-density stain-resistant rug and thermal-insulating curtains. {req.other_requirements or 'Complementary neutral tones.'}",
                estimated_price=decor_budget,
                platform="Home Centre / Amazon",
                reason="Absorbs echo and grounds the seating zone with tactile warmth.",
                external_search_query=f"neutral textured area rug curtains {req.style_preference}"
            ),
        ]

        tips = [
            f"Phase your purchases: Prioritize the main seating and primary lighting before secondary accent decor.",
            f"Look for modular furniture in {req.style_preference} styling that can be reconfigured if you move.",
            "Choose 2700K–3000K warm white bulbs for cozy living spaces, and keep switches on dimmers where possible.",
            f"Reserve the remaining ${remaining:,.2f} for delivery, assembly charges, and unexpected hardware fittings."
        ]

        return RecommendationResponse(
            planner_type="home",
            budget=budget,
            budget_summary=BudgetSummary(
                total_budget=budget,
                allocated=allocated,
                remaining=remaining,
                allocation_percentage=round((allocated / budget) * 100, 1)
            ),
            recommendations=items,
            tips=tips,
            is_fallback=True,
            disclaimer="[Local Fallback Engine] Recommendations generated via algorithmic budget distribution. External platforms are suggested search targets."
        )

    @staticmethod
    def generate_party_fallback(req: PartyPlannerRequest) -> RecommendationResponse:
        budget = req.total_budget
        per_head = budget / max(req.guest_count, 1)

        food_pct = 0.44
        venue_pct = 0.28
        decor_pct = 0.14
        entertainment_pct = 0.10

        food_budget = round(budget * food_pct, 2)
        venue_budget = round(budget * venue_pct, 2)
        decor_budget = round(budget * decor_pct, 2)
        ent_budget = round(budget * entertainment_pct, 2)
        allocated = food_budget + venue_budget + decor_budget + ent_budget
        remaining = round(budget - allocated, 2)

        items: List[RecommendationItem] = [
            RecommendationItem(
                category="Catering & Beverages",
                name=f"Curated Buffet & Beverage Package ({req.guest_count} guests)",
                description=f"Includes welcome mocktails, 3 appetizers, 2 main courses, breads, and seasonal dessert. {req.food_requirements or 'Multi-cuisine spread with balanced dietary options.'}",
                estimated_price=food_budget,
                platform="Swiggy Gourmet / Zomato Catering / Local Caterer",
                reason=f"Guarantees quality culinary coverage at ~${(food_budget / req.guest_count):,.0f} per guest.",
                external_search_query=f"catering service for {req.guest_count} guests {req.event_type}"
            ),
            RecommendationItem(
                category="Venue & Space",
                name=f"Event Venue Booking / Space Fee",
                description=f"Reservation for {req.event_type}. {req.venue_requirements or 'Space suited for comfortable mingling and dining.'}",
                estimated_price=venue_budget,
                platform="OYO Townhouse / Urban Private Lounge / Banquet Hall",
                reason="Provides dedicated acoustics, restroom facilities, and climate control.",
                external_search_query=f"venue rental {req.event_type} {req.guest_count} guests"
            ),
            RecommendationItem(
                category="Decor & Atmosphere",
                name="Thematic Decor, Lighting & Photo Backdrop",
                description=f"Customized stage or entry arch, fairy lighting canopy, and thematic accents. {req.decoration_requirements or 'Festive and photogenic styling.'}",
                estimated_price=decor_budget,
                platform="Amazon Event Supplies / Local Floral Decorator",
                reason="Transforms the venue visually without requiring structural modifications.",
                external_search_query=f"party decoration package {req.event_type}"
            ),
            RecommendationItem(
                category="Entertainment & Sound",
                name="Sound Setup, Playlist / DJ & Host Gear",
                description=f"PA speaker set with wireless microphones and curated audio setup. {req.entertainment_requirements or 'Background ambiance and party sound.'}",
                estimated_price=ent_budget,
                platform="Local AV Vendor / Sound Rental",
                reason="Ensures announcements, toasts, and music are crisp across the entire space.",
                external_search_query=f"party sound system speaker rental"
            ),
        ]

        tips = [
            f"Confirm dietary restrictions (vegetarian, vegan, nut allergies) with guests 48 hours prior to finalize quantities.",
            f"Ask your caterer if tableware and servers are included in the ${food_budget:,.2f} quote.",
            f"Use a shared digital photo album QR code on tables so guests can upload candid photos in real-time.",
            f"Keep a buffer of ${remaining:,.2f} for incidental ice refills, venue overtime, or extra disposables."
        ]

        return RecommendationResponse(
            planner_type="party",
            budget=budget,
            budget_summary=BudgetSummary(
                total_budget=budget,
                allocated=allocated,
                remaining=remaining,
                allocation_percentage=round((allocated / budget) * 100, 1)
            ),
            recommendations=items,
            tips=tips,
            is_fallback=True,
            disclaimer="[Local Fallback Engine] Recommendations generated via algorithmic event distribution. Platform suggestions are search examples."
        )

    @staticmethod
    def generate_jewelry_fallback(req: JewelryPlannerRequest) -> RecommendationResponse:
        budget = req.budget

        primary_pct = 0.65
        secondary_pct = 0.25
        care_pct = 0.05

        primary_budget = round(budget * primary_pct, 2)
        secondary_budget = round(budget * secondary_pct, 2)
        care_budget = round(budget * care_pct, 2)
        allocated = primary_budget + secondary_budget + care_budget
        remaining = round(budget - allocated, 2)

        items: List[RecommendationItem] = [
            RecommendationItem(
                category="Primary Jewel",
                name=f"{req.material_preference} {req.jewelry_type} ({req.preferred_style})",
                description=f"Masterpiece centerpiece piece crafted in {req.material_preference} with {req.preferred_color or 'brilliant'} stone highlights. Perfect for {req.occasion}.",
                estimated_price=primary_budget,
                platform="Tanishq / CaratLane / GIVA",
                reason=f"Designed to complement the {req.outfit_description or 'outfit silhouette'} without overpowering the neckline.",
                external_search_query=f"{req.material_preference} {req.jewelry_type} {req.preferred_style}"
            ),
            RecommendationItem(
                category="Coordinating Accent",
                name=f"Matching Ear Studs / Sleek Wristlet",
                description=f"Subtle coordinating companion piece reflecting the {req.preferred_style} motif in {req.material_preference}.",
                estimated_price=secondary_budget,
                platform="Mia by Tanishq / Bluestone / Amazon",
                reason="Provides symmetrical balance and versatility to wear separately on lighter occasions.",
                external_search_query=f"matching {req.material_preference} earrings {req.preferred_style}"
            ),
            RecommendationItem(
                category="Care & Preservation",
                name="Anti-Tarnish Velvet Storage Case & Microfiber Polishing Cloth",
                description="Hermetic zip storage pouch with anti-oxidation lining to preserve shine and gemstone luster.",
                estimated_price=care_budget,
                platform="Amazon / Specialized Jeweler",
                reason="Prevents sulfur-induced tarnishing and keeps delicate settings scratch-free.",
                external_search_query="anti tarnish jewelry box velvet travel"
            ),
        ]

        tips = [
            f"Always request a hallmark or certificate of authenticity when purchasing {req.material_preference}.",
            f"For {req.occasion}, apply perfume and hairspray before putting on your jewelry to protect the finish.",
            f"Clean gently with a soft microfiber cloth; avoid harsh chemical ultrasonic cleaners on porous gemstones.",
            f"You have a remaining surplus of ${remaining:,.2f} for insurance or customized sizing adjustments."
        ]

        return RecommendationResponse(
            planner_type="jewelry",
            budget=budget,
            budget_summary=BudgetSummary(
                total_budget=budget,
                allocated=allocated,
                remaining=remaining,
                allocation_percentage=round((allocated / budget) * 100, 1)
            ),
            recommendations=items,
            tips=tips,
            is_fallback=True,
            disclaimer="[Local Fallback Engine] Recommendations generated via jewelry style matching. Platform suggestions are search examples."
        )
