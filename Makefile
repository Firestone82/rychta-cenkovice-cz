.PHONY: api web test build images

# API on :8080 with a development database in api/data
api:
	cd api && go run ./cmd/rychta-api serve

# Website on :4200, proxying /api and /media to the API
web:
	cd web && npm start

test:
	cd api && go vet ./... && go test ./...
	cd web && npx ng test --no-watch

build:
	cd web && npx ng build
	cd api && CGO_ENABLED=0 go build -o bin/rychta-api ./cmd/rychta-api

# Regenerates the bundled hero, season and trip images from the original photos
images:
	python3 tools/make-static-images.py $(PHOTOS)
