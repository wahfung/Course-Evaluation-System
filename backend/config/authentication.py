from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication without CSRF check.
    CORS provides protection for cross-origin requests.
    """
    def enforce_csrf(self, request):
        return  # Skip CSRF check
