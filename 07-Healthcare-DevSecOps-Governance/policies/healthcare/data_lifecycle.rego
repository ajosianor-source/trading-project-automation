package healthgov.healthcare.data_lifecycle

import rego.v1

default allow := false

allow if {
  input.asset.source_approved == true
  input.asset.data_owner != ""
  input.asset.information_asset_owner != ""
  input.operation.purpose in input.asset.approved_purposes
  input.operation.age_days <= input.asset.retention_days
  input.operation.real_phi == false
}

violations contains "Source approval is required" if input.asset.source_approved != true
violations contains "Data and information asset owners are required" if input.asset.data_owner == ""
violations contains "Data and information asset owners are required" if input.asset.information_asset_owner == ""
violations contains "Purpose is not approved for this asset" if {
  not input.operation.purpose in input.asset.approved_purposes
}
violations contains "Retention period exceeded; deletion workflow required" if {
  input.operation.age_days > input.asset.retention_days
}
violations contains "Real PHI is outside the production pilot scope" if input.operation.real_phi == true
