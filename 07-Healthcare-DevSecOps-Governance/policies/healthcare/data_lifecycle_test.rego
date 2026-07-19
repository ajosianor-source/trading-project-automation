package healthgov.healthcare.data_lifecycle_test

import data.healthgov.healthcare.data_lifecycle
import rego.v1

test_synthetic_approved_asset_allowed if {
  data_lifecycle.allow with input as {
    "asset": {
      "source_approved": true,
      "data_owner": "data-owner",
      "information_asset_owner": "iao",
      "approved_purposes": {"operations"},
      "retention_days": 30,
    },
    "operation": {"purpose": "operations", "age_days": 2, "real_phi": false},
  }
}

test_real_phi_denied_during_pilot if {
  not data_lifecycle.allow with input as {
    "asset": {
      "source_approved": true,
      "data_owner": "data-owner",
      "information_asset_owner": "iao",
      "approved_purposes": {"treatment"},
      "retention_days": 30,
    },
    "operation": {"purpose": "treatment", "age_days": 2, "real_phi": true},
  }
}
