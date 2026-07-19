package healthgov.kubernetes.admission

import rego.v1

deny contains msg if {
	container := input.review.object.spec.containers[_]
	not container.securityContext.readOnlyRootFilesystem
	msg := sprintf("%s must use a read-only root filesystem", [container.name])
}
deny contains msg if {
	container := input.review.object.spec.containers[_]
	container.securityContext.allowPrivilegeEscalation
	msg := sprintf("%s must disable privilege escalation", [container.name])
}
deny contains msg if {
	container := input.review.object.spec.containers[_]
	not startswith(container.image, "ghcr.io/your-org/")
	msg := sprintf("%s uses an unapproved image registry", [container.name])
}
deny contains "workload must declare resource limits" if {
	container := input.review.object.spec.containers[_]
	not container.resources.limits
}

