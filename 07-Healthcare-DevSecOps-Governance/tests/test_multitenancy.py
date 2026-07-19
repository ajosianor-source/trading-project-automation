import pytest
from healthgov.multitenancy import TENANT_ID
from healthgov.security import Principal


@pytest.mark.parametrize("tenant", ["hospital-a", "nhs-trust-42", "platform"])
def test_valid_tenant_identifiers(tenant: str):
    assert TENANT_ID.fullmatch(tenant)


@pytest.mark.parametrize("tenant", ["A", "../other", "hospital_a", "x" * 64])
def test_invalid_tenant_identifiers(tenant: str):
    assert not TENANT_ID.fullmatch(tenant)


def test_principal_carries_immutable_tenant_context():
    principal = Principal(
        subject="user-1",
        tenant_id="hospital-a",
        roles=frozenset({"clinician"}),
        purpose="treatment",
    )
    assert principal.tenant_id == "hospital-a"
    with pytest.raises(AttributeError):
        principal.tenant_id = "hospital-b"
