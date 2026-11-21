.PHONY: db api web lint test build images

# PostgreSQL for development on :5432, with the databases `rychta` and `rychta_test`
db:
	docker compose -f docker-compose.dev.yml up -d

# API on :8080, restarting on changes
api:
	cd api && npm run start:dev

# Website on :4200, proxying /api and /media to the API
web:
	cd web && npm start

lint:
	cd api && npm run lint && npm run format:check
	cd web && npm run lint && npm run format:check

test:
	cd api && npm test && npm run test:e2e
	cd web && npx ng test --no-watch

build:
	cd api && npm run build
	cd web && npx ng build

# Regenerates the bundled hero, season and trip images from the original photos
images:
	python3 tools/make-static-images.py $(PHOTOS)
