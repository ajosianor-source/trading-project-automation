import os

from healthgov.crypto import PhiProtector


def test_encrypt_round_trip_and_deterministic_tokenization():
    protector = PhiProtector(os.urandom(32))
    context = b"tenant-1:patient"
    encrypted = protector.encrypt("patient@example.org", context)
    assert protector.decrypt(encrypted, context) == "patient@example.org"
    assert protector.tokenize("123", "patient") == protector.tokenize("123", "patient")
    assert "123" not in protector.tokenize("123", "patient")
