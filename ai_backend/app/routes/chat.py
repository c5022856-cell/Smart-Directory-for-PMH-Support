from __future__ import annotations

from fastapi import APIRouter, Depends

from app.clients.groq_client import GroqClient, get_groq_client
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chatbot import generate_chat_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    groq_client: GroqClient = Depends(get_groq_client),
) -> ChatResponse:
    return generate_chat_response(
        messages=request.messages,
        profile=request.profile,
        groq_client=groq_client,
    )
