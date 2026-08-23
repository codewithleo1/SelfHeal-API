# stripe_client.py
import httpx


def create_payment_intent(amount: int, currency: str) -> dict:
    """
    Create a Stripe payment intent.
    BROKEN: uses deprecated 'payment_method_types' parameter.
    """
    response = httpx.post(
        "https://api.stripe.com/v1/payment_intents",
        headers={"Authorization": "Bearer sk_test_placeholder"},
        data={
            "amount": amount,
            "currency": currency,
            "payment_method_types": ["card"],  # deprecated — should use automatic_payment_methods
        },
    )
    return response.json()


def get_payment_intent(payment_intent_id: str) -> dict:
    """Fetch an existing payment intent."""
    response = httpx.get(
        f"https://api.stripe.com/v1/payment_intents/{payment_intent_id}",
        headers={"Authorization": "Bearer sk_test_placeholder"},
    )
    return response.json()