from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import Settings, get_settings


class LocalDatabaseError(RuntimeError):
    """Raised when the local SQLite database cannot fulfill a request."""


SERVICE_SEED_DATA = [
    {
        "id": "service-nhs-111-mental-health-option",
        "name": "NHS 111 (Mental Health Option)",
        "description": "Immediate help for urgent mental health concerns through the NHS 111 mental health option.",
        "support_type": "crisis",
        "languages": ["English"],
        "delivery_modes": ["phone"],
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": ["crisis", "urgent", "emotional"],
        "interaction_tags": ["phone"],
        "location": "National",
        "distance_label": None,
        "availability": "24/7",
        "phone": "111",
        "email": None,
        "website": "https://111.nhs.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 10,
        "crisis_capable": 1,
        "is_active": 1,
    },
    {
        "id": "service-samaritans",
        "name": "Samaritans",
        "description": "Immediate emotional support for anyone in distress who needs urgent listening and support.",
        "support_type": "crisis",
        "languages": ["English"],
        "delivery_modes": ["phone"],
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": ["crisis", "urgent", "emotional"],
        "interaction_tags": ["phone"],
        "location": "National",
        "distance_label": None,
        "availability": "24/7",
        "phone": "116 123",
        "email": None,
        "website": "https://www.samaritans.org/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 10,
        "crisis_capable": 1,
        "is_active": 1,
    },
    {
        "id": "service-shout-eyup",
        "name": "Shout",
        "description": "Immediate crisis text support for urgent mental health concerns.",
        "support_type": "crisis",
        "languages": ["English"],
        "delivery_modes": ["message", "phone"],
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": ["crisis", "urgent", "emotional"],
        "interaction_tags": ["message", "phone"],
        "location": "National",
        "distance_label": None,
        "availability": "24/7 text support",
        "phone": "Text EYUP to 85258",
        "email": None,
        "website": "https://giveusashout.org/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 10,
        "crisis_capable": 1,
        "is_active": 1,
    },
    {
        "id": "service-sheffield-mental-health-guide",
        "name": "Sheffield Mental Health Guide",
        "description": "A central directory helping Sheffield residents find mental health services and support tailored to their needs.",
        "support_type": "group",
        "languages": ["English"],
        "delivery_modes": ["online"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["practical", "navigation", "directory"],
        "interaction_tags": ["online"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Website resource",
        "phone": None,
        "email": None,
        "website": "https://www.sheffieldmentalhealth.co.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-light-peer-support",
        "name": "Light Peer Support",
        "description": "Peer support groups and 1:1 sessions for parents during pregnancy and up to 2 years after birth.",
        "support_type": "peer",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["peer", "emotional", "practical"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Groups and 1:1 support available",
        "phone": "0114 438 8962",
        "email": None,
        "website": "https://lightpeersupport.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-talking-therapies-sheffield",
        "name": "Talking Therapies Sheffield",
        "description": "Free NHS therapy service offering CBT and counselling.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "clinical", "emotional"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "NHS service",
        "phone": "0114 226 4380",
        "email": None,
        "website": "https://www.sheffieldtalkingtherapies.nhs.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-roshni-sheffield",
        "name": "Roshni Sheffield",
        "description": "Women-only culturally sensitive counselling for South Asian women.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "emotional", "culturally-sensitive"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Women-only counselling service",
        "phone": "0114 250 8898",
        "email": None,
        "website": "https://www.roshnisheffield.co.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-sheffield-flourish",
        "name": "Sheffield Flourish",
        "description": "Creative wellbeing activities including art, gardening, and music.",
        "support_type": "group",
        "languages": ["English"],
        "delivery_modes": ["in-person", "online"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["group", "wellbeing", "creative", "peer"],
        "interaction_tags": ["inperson", "online"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Creative wellbeing activities",
        "phone": "0114 273 7009",
        "email": None,
        "website": "https://sheffieldflourish.co.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 5,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-sheffield-mind",
        "name": "Sheffield Mind",
        "description": "Counselling, support groups, and wellbeing services.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "group", "wellbeing", "emotional"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Counselling and wellbeing support",
        "phone": "0114 2584489",
        "email": None,
        "website": "https://www.sheffieldmind.co.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-sheffield-perinatal-mental-health-service",
        "name": "Sheffield Perinatal Mental Health Service",
        "description": "Specialist NHS support for complex perinatal mental health needs.",
        "support_type": "clinical",
        "languages": ["English"],
        "delivery_modes": ["in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["clinical", "perinatal", "emotional"],
        "interaction_tags": ["inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "GP/Midwife referral required",
        "phone": None,
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 8,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-birth-in-mind",
        "name": "Birth in Mind",
        "description": "Support for processing birth experiences.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["in-person"],
        "motherhood_stages": ["postpartum"],
        "support_tags": ["counseling", "birth-experience", "emotional"],
        "interaction_tags": ["inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Referral required",
        "phone": None,
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-pairs",
        "name": "PAIRS",
        "description": "Supports parent-infant relationships.",
        "support_type": "peer",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["postpartum"],
        "support_tags": ["peer", "parent-infant", "practical", "emotional"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Parent-infant support",
        "phone": "0114 305 3659",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-no-panic-sheffield",
        "name": "No Panic Sheffield",
        "description": "CBT-based anxiety support groups.",
        "support_type": "group",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["group", "anxiety", "cbt", "emotional"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Support groups available",
        "phone": "07505 712 164",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 5,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-spcs",
        "name": "SPCS",
        "description": "Counselling for pregnancy-related challenges.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["online", "in-person"],
        "motherhood_stages": ["pregnant"],
        "support_tags": ["counseling", "pregnancy", "emotional"],
        "interaction_tags": ["online", "inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Pregnancy-related counselling",
        "phone": None,
        "email": None,
        "website": "https://www.spcsonline.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-jessop-wing-emotional-wellbeing-team",
        "name": "Jessop Wing Emotional Wellbeing Team",
        "description": "Midwife-led emotional support during pregnancy.",
        "support_type": "clinical",
        "languages": ["English"],
        "delivery_modes": ["in-person"],
        "motherhood_stages": ["pregnant"],
        "support_tags": ["clinical", "pregnancy", "emotional"],
        "interaction_tags": ["inperson"],
        "location": "Sheffield",
        "distance_label": None,
        "availability": "Midwife-led support",
        "phone": None,
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-rdash",
        "name": "RDaSH",
        "description": "NHS mental health and perinatal services.",
        "support_type": "clinical",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["clinical", "perinatal", "emotional"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Rotherham",
        "distance_label": None,
        "availability": "NHS mental health service",
        "phone": "03000 211 556",
        "email": None,
        "website": "https://www.rdash.nhs.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-rotherham-talking-therapies",
        "name": "Rotherham Talking Therapies",
        "description": "Free NHS therapy service.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "clinical", "emotional"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Rotherham",
        "distance_label": None,
        "availability": "NHS therapy service",
        "phone": "01709 447755",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-doncaster-talking-therapies",
        "name": "Doncaster Talking Therapies",
        "description": "NHS therapy support for mental health.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "clinical", "emotional"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Doncaster",
        "distance_label": None,
        "availability": "NHS therapy support",
        "phone": "03000 211 556",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-doncaster-mind",
        "name": "Doncaster Mind",
        "description": "Community mental health support.",
        "support_type": "peer",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["peer", "community", "emotional"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Doncaster",
        "distance_label": None,
        "availability": "Community support service",
        "phone": "01302 812800",
        "email": None,
        "website": "https://www.doncastermind.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 5,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-barnsley-talking-therapies",
        "name": "Barnsley Talking Therapies",
        "description": "NHS therapy services.",
        "support_type": "counseling",
        "languages": ["English"],
        "delivery_modes": ["phone", "online", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["counseling", "clinical", "emotional"],
        "interaction_tags": ["phone", "online", "inperson"],
        "location": "Barnsley",
        "distance_label": None,
        "availability": "NHS therapy service",
        "phone": "01226 644900",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 6,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-barnsley-perinatal-mental-health",
        "name": "Barnsley Perinatal Mental Health",
        "description": "Specialist perinatal support.",
        "support_type": "clinical",
        "languages": ["English"],
        "delivery_modes": ["phone", "in-person"],
        "motherhood_stages": ["pregnant", "postpartum"],
        "support_tags": ["clinical", "perinatal", "emotional"],
        "interaction_tags": ["phone", "inperson"],
        "location": "Barnsley",
        "distance_label": None,
        "availability": "Specialist perinatal support",
        "phone": "01226 644829",
        "email": None,
        "website": None,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 7,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-mind-uk",
        "name": "Mind UK",
        "description": "National mental health charity.",
        "support_type": "peer",
        "languages": ["English"],
        "delivery_modes": ["online", "phone"],
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": ["peer", "community", "emotional", "practical"],
        "interaction_tags": ["online", "phone"],
        "location": "National",
        "distance_label": None,
        "availability": "National support and information",
        "phone": None,
        "email": None,
        "website": "https://www.mind.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 5,
        "crisis_capable": 0,
        "is_active": 1,
    },
    {
        "id": "service-womens-aid",
        "name": "Women's Aid",
        "description": "Domestic abuse support.",
        "support_type": "crisis",
        "languages": ["English"],
        "delivery_modes": ["phone", "online"],
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": ["crisis", "safeguarding", "practical", "emotional"],
        "interaction_tags": ["phone", "online"],
        "location": "National",
        "distance_label": None,
        "availability": "National domestic abuse support",
        "phone": "0808 2000 247",
        "email": None,
        "website": "https://www.womensaid.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 8,
        "crisis_capable": 1,
        "is_active": 1,
    },
    {
        "id": "service-cry-sis",
        "name": "Cry-sis",
        "description": "Support for parents with babies’ crying and sleep issues.",
        "support_type": "peer",
        "languages": ["English"],
        "delivery_modes": ["phone", "online"],
        "motherhood_stages": ["postpartum"],
        "support_tags": ["peer", "practical", "sleep", "baby-care"],
        "interaction_tags": ["phone", "online"],
        "location": "National",
        "distance_label": None,
        "availability": "National parent support",
        "phone": "0800 448 0737",
        "email": None,
        "website": "https://www.cry-sis.org.uk/",
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": 5,
        "crisis_capable": 0,
        "is_active": 1,
    },
]

LEGACY_SERVICE_IDS = [
    "service-perinatal-mental-health-team",
    "service-mamas-circle-peer-support",
    "service-postpartum-support-group",
    "service-arabic-womens-support-service",
    "service-parent-crisis-line",
]


def _workflow_service(
    *,
    service_id: str,
    name: str,
    description: str,
    support_type: str,
    delivery_modes: list[str],
    support_tags: list[str],
    location: str,
    availability: str,
    phone: str | None = None,
    email: str | None = None,
    website: str | None = None,
    priority_level: int = 5,
    crisis_capable: int = 0,
) -> dict[str, Any]:
    return {
        "id": service_id,
        "name": name,
        "description": description,
        "support_type": support_type,
        "languages": ["English"],
        "delivery_modes": delivery_modes,
        "motherhood_stages": ["pregnant", "postpartum", "supporter"],
        "support_tags": support_tags,
        "interaction_tags": [mode.replace("in-person", "inperson") for mode in delivery_modes],
        "location": location,
        "distance_label": None,
        "availability": availability,
        "phone": phone,
        "email": email,
        "website": website,
        "address": None,
        "rating": 0,
        "review_count": 0,
        "priority_level": priority_level,
        "crisis_capable": crisis_capable,
        "is_active": 1,
    }


ACTIVE_SERVICE_SEED_DATA = [
    _workflow_service(
        service_id="service-nhs-111-mental-health-option",
        name="NHS 111 (Mental Health Option)",
        description="Immediate help for urgent mental health concerns through the NHS 111 mental health option.",
        support_type="crisis",
        delivery_modes=["phone"],
        support_tags=["crisis", "urgent", "mental health"],
        location="National",
        availability="24/7",
        phone="111",
        website="https://111.nhs.uk/",
        priority_level=10,
        crisis_capable=1,
    ),
    _workflow_service(
        service_id="service-samaritans",
        name="Samaritans",
        description="Immediate emotional support for anyone in distress who needs urgent listening support.",
        support_type="crisis",
        delivery_modes=["phone"],
        support_tags=["crisis", "urgent", "mental health"],
        location="National",
        availability="24/7",
        phone="116 123",
        website="https://www.samaritans.org/",
        priority_level=10,
        crisis_capable=1,
    ),
    _workflow_service(
        service_id="service-shout-eyup",
        name="Shout",
        description="Immediate text-based crisis support for urgent mental health concerns.",
        support_type="crisis",
        delivery_modes=["message", "phone"],
        support_tags=["crisis", "urgent", "mental health"],
        location="National",
        availability="24/7 text support",
        phone="Text EYUP to 85258",
        website="https://giveusashout.org/",
        priority_level=10,
        crisis_capable=1,
    ),
    _workflow_service(
        service_id="service-no-panic-cb-therapy",
        name="No Panic CB Therapy",
        description="CBT-style anxiety support that can help with panic, anxiety, and related mental health concerns.",
        support_type="group",
        delivery_modes=["phone", "email"],
        support_tags=["anxiety", "therapy", "mental health", "sheffield"],
        location="Sheffield",
        availability="Phone or email contact route",
        phone="07505 712 164",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-light-support-services",
        name="Light Support Services",
        description="Parent-focused peer support and practical signposting during and after pregnancy.",
        support_type="peer",
        delivery_modes=["phone", "email", "online"],
        support_tags=["parent", "partner", "family", "wellbeing", "sheffield"],
        location="Sheffield",
        availability="Phone, email, and online support",
        phone="0114 438 8962",
        website="https://lightpeersupport.org.uk/",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-talking-therapies-sheffield",
        name="Talking Therapies Sheffield",
        description="NHS therapy and counselling access for anxiety, depression, trauma, and wider mental health needs.",
        support_type="counseling",
        delivery_modes=["phone", "email", "online"],
        support_tags=["therapy", "anxiety", "depression", "mental health", "sheffield"],
        location="Sheffield",
        availability="Phone, email, and online access",
        phone="0114 226 4380",
        website="https://www.sheffieldtalkingtherapies.nhs.uk/",
        priority_level=9,
    ),
    _workflow_service(
        service_id="service-roshini-sheffield",
        name="Support to South-Asian Women (Roshni Sheffield)",
        description="Culturally-aware support and counselling for South-Asian women and families in Sheffield.",
        support_type="counseling",
        delivery_modes=["phone", "email"],
        support_tags=["south-asian", "asian", "family", "therapy", "sheffield"],
        location="Sheffield",
        availability="Phone or email contact route",
        phone="0114 250 8898",
        website="https://www.roshnisheffield.co.uk/",
        priority_level=9,
    ),
    _workflow_service(
        service_id="service-sps",
        name="SPS",
        description="Pregnancy and parent-focused support that can help before birth and during the perinatal period.",
        support_type="resource",
        delivery_modes=["phone", "email", "online"],
        support_tags=["pre-birth", "birth", "parent", "midwife", "sheffield"],
        location="Sheffield",
        availability="Phone, email, and online information",
        website="https://www.spcsonline.org.uk/",
        priority_level=7,
    ),
    _workflow_service(
        service_id="service-sheffield-perinatal-mental-health",
        name="Sheffield Perinatal Mental Health",
        description="Specialist perinatal mental health support for pregnancy and after birth.",
        support_type="clinical",
        delivery_modes=["phone", "email"],
        support_tags=["mental health", "perinatal", "midwife", "gp", "sheffield"],
        location="Sheffield",
        availability="Referral and clinical contact route",
        priority_level=9,
    ),
    _workflow_service(
        service_id="service-sheffield-flourish",
        name="Sheffield Flourish",
        description="Wellbeing activities and community signposting that can support confidence, recovery, and practical self-care.",
        support_type="group",
        delivery_modes=["online", "social"],
        support_tags=["wellbeing", "community", "social", "sheffield"],
        location="Sheffield",
        availability="Online and social content",
        phone="0114 273 7009",
        website="https://sheffieldflourish.co.uk/",
        priority_level=7,
    ),
    _workflow_service(
        service_id="service-sheffield-mind",
        name="Sheffield Mind",
        description="Mental health support, counselling, and community wellbeing services in Sheffield.",
        support_type="counseling",
        delivery_modes=["phone", "email", "online"],
        support_tags=["mental health", "wellbeing", "therapy", "sheffield"],
        location="Sheffield",
        availability="Phone, email, and online access",
        phone="0114 2584489",
        website="https://www.sheffieldmind.co.uk/",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-bird-mind",
        name="Bird Mind",
        description="Support for processing difficult birth experiences, trauma, and related mental health needs.",
        support_type="counseling",
        delivery_modes=["online", "email"],
        support_tags=["birth trauma", "trauma", "therapy", "sheffield"],
        location="Sheffield",
        availability="Online or email-based access",
        priority_level=7,
    ),
    _workflow_service(
        service_id="service-peanuts",
        name="Peanuts",
        description="Peer connection and social support for mothers who want community and shared experience.",
        support_type="peer",
        delivery_modes=["social", "online"],
        support_tags=["peer", "community", "single", "parent", "sheffield"],
        location="Sheffield",
        availability="Social and online community route",
        website="https://www.peanut-app.io/",
        priority_level=6,
    ),
    _workflow_service(
        service_id="service-mat-exp",
        name="Mat Exp",
        description="Maternity experience signposting and information that can help women understand service options.",
        support_type="resource",
        delivery_modes=["social", "online"],
        support_tags=["birth", "parent", "family", "sheffield"],
        location="Sheffield",
        availability="Social and online information",
        priority_level=6,
    ),
    _workflow_service(
        service_id="service-birth-trauma-association-peer-support",
        name="Birth Trauma Association Peer-Support",
        description="Peer-based support and information for women affected by traumatic birth experiences.",
        support_type="peer",
        delivery_modes=["email", "online"],
        support_tags=["birth trauma", "trauma", "peer", "sheffield", "uk"],
        location="Sheffield",
        availability="Email and online support",
        website="https://www.birthtraumaassociation.org.uk/",
        priority_level=7,
    ),
    _workflow_service(
        service_id="service-pnd",
        name="PND",
        description="Information and peer-focused signposting related to postnatal depression and low mood after birth.",
        support_type="peer",
        delivery_modes=["online", "social"],
        support_tags=["depression", "mental health", "postpartum", "sheffield"],
        location="Sheffield",
        availability="Online and social signposting",
        priority_level=6,
    ),
    _workflow_service(
        service_id="service-birth-trauma",
        name="Birth Trauma",
        description="Online information and signposting around birth trauma, PTSD, and recovery after difficult experiences.",
        support_type="resource",
        delivery_modes=["online"],
        support_tags=["birth trauma", "ptsd", "trauma", "sheffield"],
        location="Sheffield",
        availability="Online resource",
        priority_level=6,
    ),
    _workflow_service(
        service_id="service-bacp",
        name="BACP",
        description="National directory of accredited therapists and counsellors that can be filtered for relevant support needs.",
        support_type="resource",
        delivery_modes=["email", "online"],
        support_tags=["therapy", "counselling", "mental health", "uk", "nationwide"],
        location="National",
        availability="Email and online directory access",
        website="https://www.bacp.co.uk/search/Therapists",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-cry-sis",
        name="CRY-SIS",
        description="Support for parents dealing with crying, sleep, exhaustion, and the early pressures of caring for a baby.",
        support_type="peer",
        delivery_modes=["phone", "email", "online"],
        support_tags=["crying", "sleep", "exhaustion", "parent", "uk", "nationwide"],
        location="National",
        availability="Phone, email, and online information",
        phone="0800 448 0737",
        website="https://www.cry-sis.org.uk/",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-womens-aid",
        name="Women's Aid",
        description="National support for domestic abuse, safety planning, and crisis-related help.",
        support_type="crisis",
        delivery_modes=["phone", "email", "online"],
        support_tags=["crisis", "abuse", "violence", "safety", "uk", "nationwide"],
        location="National",
        availability="Phone, email, and online support",
        phone="0808 2000 247",
        website="https://www.womensaid.org.uk/",
        priority_level=9,
        crisis_capable=1,
    ),
    _workflow_service(
        service_id="service-mind-uk",
        name="Mind",
        description="National mental health information, support signposting, and practical guidance.",
        support_type="resource",
        delivery_modes=["phone", "email", "online"],
        support_tags=["mental health", "wellbeing", "uk", "nationwide"],
        location="National",
        availability="Phone, email, and online access",
        website="https://www.mind.org.uk/",
        priority_level=8,
    ),
    _workflow_service(
        service_id="service-right-decisions-maternal-health-tool-kit",
        name="Right Decisions Maternal Health Tool-Kit",
        description="National online maternal mental health toolkit with information, signposting, and self-directed resources.",
        support_type="resource",
        delivery_modes=["online"],
        support_tags=["maternal health", "wellbeing", "online", "uk", "nationwide"],
        location="National",
        availability="Online toolkit",
        website="https://rightdecisions.scot.nhs.uk/",
        priority_level=7,
    ),
]

EVENT_SEED_DATA = [
    {
        "id": "event-postnatal-wellness-workshop",
        "title": "Postnatal Wellness Workshop",
        "topic": "Emotional Support",
        "description": "A gentle session on managing emotions after birth.",
        "language": "English",
        "event_date": "2026-03-15T10:00:00+00:00",
        "mode": "online",
        "location": None,
    },
    {
        "id": "event-arabic-support-circle",
        "title": "Arabic Mothers Support Circle",
        "topic": "Practical Support",
        "description": "Practical support and community discussion for Arabic-speaking mothers.",
        "language": "Arabic",
        "event_date": "2026-03-17T14:00:00+00:00",
        "mode": "online",
        "location": None,
    },
    {
        "id": "event-spotkanie-mam",
        "title": "Spotkanie Mam",
        "topic": "Peer Support",
        "description": "Spotkanie grupy wsparcia dla mam.",
        "language": "Polish",
        "event_date": "2026-03-19T11:00:00+00:00",
        "mode": "in-person",
        "location": "London Community Hub",
    },
    {
        "id": "event-anxiety-new-motherhood",
        "title": "Anxiety and New Motherhood",
        "topic": "Clinical Support",
        "description": "Understanding anxiety in the perinatal period.",
        "language": "English",
        "event_date": "2026-03-22T09:30:00+00:00",
        "mode": "online",
        "location": None,
    },
]


def _encode_list(values: list[str]) -> str:
    return json.dumps(values)


def _decode_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return json.loads(raw)


class SQLiteStore:
    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        self._write_lock = threading.Lock()
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_database()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database_path, timeout=10, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL;")
        connection.execute("PRAGMA busy_timeout = 10000;")
        return connection

    def _initialize_database(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS services (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  description TEXT,
                  support_type TEXT NOT NULL,
                  languages TEXT NOT NULL,
                  delivery_modes TEXT NOT NULL,
                  motherhood_stages TEXT NOT NULL,
                  support_tags TEXT NOT NULL,
                  interaction_tags TEXT NOT NULL,
                  location TEXT,
                  distance_label TEXT,
                  availability TEXT,
                  phone TEXT,
                  email TEXT,
                  website TEXT,
                  address TEXT,
                  rating REAL NOT NULL DEFAULT 4.5,
                  review_count INTEGER NOT NULL DEFAULT 0,
                  priority_level INTEGER NOT NULL DEFAULT 0,
                  crisis_capable INTEGER NOT NULL DEFAULT 0,
                  is_active INTEGER NOT NULL DEFAULT 1,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS support_requests (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  original_text TEXT NOT NULL,
                  detected_language TEXT,
                  motherhood_stage TEXT,
                  support_types TEXT NOT NULL,
                  interaction_preferences TEXT NOT NULL,
                  risk_level TEXT NOT NULL DEFAULT 'low',
                  keywords TEXT NOT NULL,
                  summary TEXT,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS translation_cache (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_hash TEXT NOT NULL,
                  source_text TEXT NOT NULL,
                  source_language TEXT NOT NULL,
                  target_language TEXT NOT NULL,
                  translated_text TEXT NOT NULL,
                  provider TEXT NOT NULL,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(source_hash, source_language, target_language, provider)
                );

                CREATE TABLE IF NOT EXISTS events (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  topic TEXT NOT NULL,
                  description TEXT,
                  language TEXT NOT NULL,
                  event_date TEXT NOT NULL,
                  mode TEXT NOT NULL,
                  location TEXT,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS community_posts (
                  id TEXT PRIMARY KEY,
                  user_id TEXT,
                  author_name TEXT,
                  content TEXT NOT NULL,
                  is_anonymous INTEGER NOT NULL DEFAULT 1,
                  original_language TEXT NOT NULL DEFAULT 'en',
                  status TEXT NOT NULL DEFAULT 'visible',
                  like_count INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            self._seed_services(connection)
            self._seed_events(connection)

    def _seed_services(self, connection: sqlite3.Connection) -> None:
        connection.executemany(
            """
            INSERT INTO services (
              id, name, description, support_type, languages, delivery_modes,
              motherhood_stages, support_tags, interaction_tags, location, distance_label,
              availability, phone, email, website, address, rating, review_count,
              priority_level, crisis_capable, is_active
            ) VALUES (
              :id, :name, :description, :support_type, :languages, :delivery_modes,
              :motherhood_stages, :support_tags, :interaction_tags, :location, :distance_label,
              :availability, :phone, :email, :website, :address, :rating, :review_count,
              :priority_level, :crisis_capable, :is_active
            )
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              support_type = excluded.support_type,
              languages = excluded.languages,
              delivery_modes = excluded.delivery_modes,
              motherhood_stages = excluded.motherhood_stages,
              support_tags = excluded.support_tags,
              interaction_tags = excluded.interaction_tags,
              location = excluded.location,
              distance_label = excluded.distance_label,
              availability = excluded.availability,
              phone = excluded.phone,
              email = excluded.email,
              website = excluded.website,
              address = excluded.address,
              rating = excluded.rating,
              review_count = excluded.review_count,
              priority_level = excluded.priority_level,
              crisis_capable = excluded.crisis_capable,
              is_active = excluded.is_active
            """,
            [
                {
                    **service,
                    "languages": _encode_list(service["languages"]),
                    "delivery_modes": _encode_list(service["delivery_modes"]),
                    "motherhood_stages": _encode_list(service["motherhood_stages"]),
                    "support_tags": _encode_list(service["support_tags"]),
                    "interaction_tags": _encode_list(service["interaction_tags"]),
                }
                for service in ACTIVE_SERVICE_SEED_DATA
            ],
        )
        active_ids = [service["id"] for service in ACTIVE_SERVICE_SEED_DATA]
        placeholders = ", ".join("?" for _ in active_ids)
        connection.execute(
            f"DELETE FROM services WHERE id NOT IN ({placeholders})",
            active_ids,
        )

    def _seed_events(self, connection: sqlite3.Connection) -> None:
        existing_count = connection.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        if existing_count:
            return

        connection.executemany(
            """
            INSERT INTO events (id, title, topic, description, language, event_date, mode, location)
            VALUES (:id, :title, :topic, :description, :language, :event_date, :mode, :location)
            """,
            EVENT_SEED_DATA,
        )

    def list_services(self) -> list[dict[str, Any]]:
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT *
                    FROM services
                    WHERE is_active = 1
                    ORDER BY priority_level DESC, rating DESC, name ASC
                    """
                ).fetchall()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not read services: {exc}") from exc

        return [self._row_to_service_dict(row) for row in rows]

    def list_events(self) -> list[dict[str, Any]]:
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT id, title, topic, description, language, event_date, mode, location
                    FROM events
                    ORDER BY event_date ASC
                    """
                ).fetchall()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not read events: {exc}") from exc

        return [dict(row) for row in rows]

    def list_community_posts(self, *, include_hidden: bool = False) -> list[dict[str, Any]]:
        where_clause = "" if include_hidden else "WHERE status = 'visible'"
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    f"""
                    SELECT id, user_id, author_name, content, is_anonymous, original_language,
                           status, like_count, created_at, updated_at
                    FROM community_posts
                    {where_clause}
                    ORDER BY created_at DESC
                    """
                ).fetchall()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not read community posts: {exc}") from exc

        return [self._row_to_community_post_dict(row) for row in rows]

    def create_community_post(self, payload: dict[str, Any]) -> dict[str, Any]:
        post_id = str(uuid.uuid4())
        content = str(payload["content"]).strip()
        if not content:
            raise LocalDatabaseError("Community post content cannot be empty.")

        try:
            with self._write_lock:
                with self._connect() as connection:
                    connection.execute(
                        """
                        INSERT INTO community_posts (
                          id, user_id, author_name, content, is_anonymous, original_language, status
                        ) VALUES (?, ?, ?, ?, ?, ?, 'visible')
                        """,
                        (
                            post_id,
                            payload.get("user_id"),
                            payload.get("author_name"),
                            content,
                            1 if payload.get("is_anonymous", True) else 0,
                            payload.get("original_language") or "en",
                        ),
                    )
                    row = connection.execute(
                        """
                        SELECT id, user_id, author_name, content, is_anonymous, original_language,
                               status, like_count, created_at, updated_at
                        FROM community_posts
                        WHERE id = ?
                        """,
                        (post_id,),
                    ).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not create community post: {exc}") from exc

        if row is None:
            raise LocalDatabaseError("Could not load created community post.")

        return self._row_to_community_post_dict(row)

    def set_community_post_status(self, post_id: str, status: str) -> dict[str, Any]:
        if status not in {"visible", "hidden"}:
            raise LocalDatabaseError("Community post status must be visible or hidden.")

        try:
            with self._write_lock:
                with self._connect() as connection:
                    connection.execute(
                        """
                        UPDATE community_posts
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        (status, post_id),
                    )
                    row = connection.execute(
                        """
                        SELECT id, user_id, author_name, content, is_anonymous, original_language,
                               status, like_count, created_at, updated_at
                        FROM community_posts
                        WHERE id = ?
                        """,
                        (post_id,),
                    ).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not update community post: {exc}") from exc

        if row is None:
            raise LocalDatabaseError("Community post not found.")

        return self._row_to_community_post_dict(row)

    def delete_community_post(self, post_id: str) -> None:
        try:
            with self._write_lock:
                with self._connect() as connection:
                    cursor = connection.execute("DELETE FROM community_posts WHERE id = ?", (post_id,))
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not delete community post: {exc}") from exc

        if cursor.rowcount == 0:
            raise LocalDatabaseError("Community post not found.")

    def adjust_community_post_like_count(self, post_id: str, *, liked: bool) -> dict[str, Any]:
        delta = 1 if liked else -1
        try:
            with self._write_lock:
                with self._connect() as connection:
                    connection.execute(
                        """
                        UPDATE community_posts
                        SET like_count = MAX(like_count + ?, 0), updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        (delta, post_id),
                    )
                    row = connection.execute(
                        """
                        SELECT id, user_id, author_name, content, is_anonymous, original_language,
                               status, like_count, created_at, updated_at
                        FROM community_posts
                        WHERE id = ?
                        """,
                        (post_id,),
                    ).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not update community post like count: {exc}") from exc

        if row is None:
            raise LocalDatabaseError("Community post not found.")

        return self._row_to_community_post_dict(row)

    def insert_support_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO support_requests (
                      user_id, original_text, detected_language, motherhood_stage, support_types,
                      interaction_preferences, risk_level, keywords, summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload.get("user_id"),
                        payload["original_text"],
                        payload.get("detected_language"),
                        payload.get("motherhood_stage"),
                        _encode_list(payload.get("support_types", [])),
                        _encode_list(payload.get("interaction_preferences", [])),
                        payload.get("risk_level", "low"),
                        _encode_list(payload.get("keywords", [])),
                        payload.get("summary"),
                    ),
                )
                row_id = cursor.lastrowid
                row = connection.execute("SELECT * FROM support_requests WHERE id = ?", (row_id,)).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not save support request: {exc}") from exc

        if row is None:
            raise LocalDatabaseError("Could not load inserted support request.")

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "original_text": row["original_text"],
            "detected_language": row["detected_language"],
            "motherhood_stage": row["motherhood_stage"],
            "support_types": _decode_list(row["support_types"]),
            "interaction_preferences": _decode_list(row["interaction_preferences"]),
            "risk_level": row["risk_level"],
            "keywords": _decode_list(row["keywords"]),
            "summary": row["summary"],
            "created_at": row["created_at"],
        }

    def get_cached_translation(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        provider: str,
    ) -> dict[str, Any] | None:
        source_hash = hashlib.sha256(source_text.encode("utf-8")).hexdigest()

        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT source_text, source_language, target_language, translated_text, provider, created_at
                    FROM translation_cache
                    WHERE source_hash = ?
                      AND source_language = ?
                      AND target_language = ?
                      AND provider = ?
                    """,
                    (source_hash, source_language, target_language, provider),
                ).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not read translation cache: {exc}") from exc

        if row is None:
            return None

        return dict(row)

    def cache_translation(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        translated_text: str,
        provider: str,
    ) -> dict[str, Any]:
        source_hash = hashlib.sha256(source_text.encode("utf-8")).hexdigest()

        try:
            with self._write_lock:
                with self._connect() as connection:
                    connection.execute(
                        """
                        INSERT INTO translation_cache (
                          source_hash, source_text, source_language, target_language, translated_text, provider
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(source_hash, source_language, target_language, provider)
                        DO UPDATE SET translated_text = excluded.translated_text
                        """,
                        (
                            source_hash,
                            source_text,
                            source_language,
                            target_language,
                            translated_text,
                            provider,
                        ),
                    )
                    row = connection.execute(
                        """
                        SELECT source_text, source_language, target_language, translated_text, provider, created_at
                        FROM translation_cache
                        WHERE source_hash = ?
                          AND source_language = ?
                          AND target_language = ?
                          AND provider = ?
                        """,
                        (source_hash, source_language, target_language, provider),
                    ).fetchone()
        except sqlite3.Error as exc:
            raise LocalDatabaseError(f"Could not write translation cache: {exc}") from exc

        if row is None:
            raise LocalDatabaseError("Could not load cached translation.")

        return dict(row)

    def _row_to_service_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "support_type": row["support_type"],
            "languages": _decode_list(row["languages"]),
            "delivery_modes": _decode_list(row["delivery_modes"]),
            "motherhood_stages": _decode_list(row["motherhood_stages"]),
            "support_tags": _decode_list(row["support_tags"]),
            "interaction_tags": _decode_list(row["interaction_tags"]),
            "location": row["location"],
            "distance_label": row["distance_label"],
            "availability": row["availability"],
            "phone": row["phone"],
            "email": row["email"],
            "website": row["website"],
            "address": row["address"],
            "rating": row["rating"],
            "review_count": row["review_count"],
            "priority_level": row["priority_level"],
            "crisis_capable": bool(row["crisis_capable"]),
            "is_active": bool(row["is_active"]),
        }

    def _row_to_community_post_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "author_name": row["author_name"],
            "content": row["content"],
            "is_anonymous": bool(row["is_anonymous"]),
            "original_language": row["original_language"],
            "status": row["status"],
            "like_count": row["like_count"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


@lru_cache(maxsize=1)
def get_sqlite_store() -> SQLiteStore:
    settings = get_settings()
    return SQLiteStore(settings.database_path)
