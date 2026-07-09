import pytest

from stockforge_ml.ibkr import IbkrConnectionConfig


def test_ibkr_config_is_local_and_paper_only():
    config = IbkrConnectionConfig(port=7497, client_id=41)
    assert config.environment == "paper"

    with pytest.raises(ValueError, match="local"):
        IbkrConnectionConfig(host="broker.example.com")
    with pytest.raises(ValueError, match="paper"):
        IbkrConnectionConfig(environment="live")
    with pytest.raises(ValueError, match="paper port"):
        IbkrConnectionConfig(port=7496)
