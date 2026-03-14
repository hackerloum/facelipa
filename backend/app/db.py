"""Supabase database client."""
from supabase import create_client, Client

from app.config import settings


def get_supabase() -> Client:
    """Return Supabase client with service role key."""
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
