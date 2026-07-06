.PHONY: all lint lint-esm lint-v43 test check install clean

all: check

lint: lint-esm lint-v43

lint-esm:
	@echo "Linting ESM files (GNOME 45+)..."
	npx eslint lib.js extension.js prefs.js

lint-v43:
	@echo "Linting v43 files (GNOME 43)..."
	npx eslint v43/extension.js v43/prefs.js

test:
	@echo "Running unit tests..."
	node --test tests/*.test.js

check: lint test
	@echo "All checks passed."

install:
	bash install.sh

clean:
	rm -f schemas/gschemas.compiled
	rm -f tmp/renderorange-dynamic-*.css
