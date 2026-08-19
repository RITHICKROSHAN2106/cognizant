import os
import datetime
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("medinsight.llm")


class PatientLLMService:

    @classmethod
    def generate_chat_response(
        cls,
        patient_id: Optional[int],
        user_message: str,
        history: List[Dict[str, str]],
        prompt: Optional[str] = None,
        db: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Generate clinical AI response using Google Gemini.
        Strictly grounds answers in the verified patient context prompt.
        """
        api_key = settings.GENAI_API_KEY
        reply_text = None
        used_model = settings.GENAI_MODEL or "gemini-3.1-flash-lite"

        if not prompt:
            prompt = f"You are MedInsight AI, a clinical decision support assistant.\n\nUser Question: {user_message}"

        if api_key and len(api_key) > 5:
            # Format conversation for Gemini
            contents = []
            for h in (history or [])[-4:]:
                role = "user" if h.get("role") == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": h.get("content", "")}]
                })
            
            contents.append({
                "role": "user",
                "parts": [{"text": prompt}]
            })

            # Candidate model fallback list
            candidate_models = [used_model, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite-preview"]
            # Deduplicate while preserving order
            unique_candidates = list(dict.fromkeys(candidate_models))

            for model_name in unique_candidates:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    resp = httpx.post(url, json={"contents": contents}, timeout=25.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                reply_text = parts[0].get("text", "")
                                used_model = model_name
                                break
                    else:
                        logger.warning(f"Gemini model {model_name} returned status {resp.status_code}: {resp.text[:200]}")
                except Exception as e:
                    logger.warning(f"Gemini call to {model_name} failed: {e}")

        # If Gemini is unavailable, do NOT substitute fake data. Return standard unavailable notice.
        if not reply_text:
            reply_text = (
                "**Clinical Decision Support Notice**\n\n"
                "Clinical Copilot is temporarily unavailable. "
                "Please verify your connection and try again shortly."
            )

        return {
            "patient_id": patient_id,
            "reply": reply_text,
            "model": f"Google Gemini ({used_model})",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "disclaimer": "Clinical Decision Support — These insights assist clinical review and do not replace independent clinical judgment."
        }


llm_service = PatientLLMService()
