.PHONY: lint test policy-test validate
lint:
	ruff check shared services tests
test:
	pytest -q
policy-test:
	opa test policies -v
validate: lint test policy-test

