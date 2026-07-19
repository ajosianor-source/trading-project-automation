function OnStoredInstance(instanceId, tags, metadata, origin)
  -- Quarantine first. Only the derived anonymized instance may leave this trust zone.
  local replace = {
    PatientName = "ANONYMIZED",
    PatientID = "ANON-" .. instanceId,
    AccessionNumber = "",
    InstitutionName = "",
    ReferringPhysicianName = ""
  }
  local remove = {
    "PatientAddress", "PatientTelephoneNumbers", "OtherPatientIDs",
    "OperatorsName", "InstitutionAddress"
  }
  RestApiPost("/instances/" .. instanceId .. "/anonymize",
    DumpJson({Replace = replace, Remove = remove, Keep = {"StudyDescription", "SeriesDescription"}}))
end

