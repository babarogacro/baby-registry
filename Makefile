.PHONY: help install dev db scrape check

help:
	@echo ""
	@echo "Listica: dostupne naredbe"
	@echo ""
	@echo "  make install    Instaliraj sve ovisnosti (backend + frontend)"
	@echo "  make db         Pokreni PostgreSQL u Dockeru + kreiraj tablice"
	@echo "  make dev        Pokreni backend i frontend u dev modu"
	@echo "  make scrape     Pokreni scrapere (Baby Center + Svijet Beba)"
	@echo "  make check      TypeScript provjera backenda i frontenda"
	@echo ""

install:
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Instalacija završena!"

db:
	docker compose up -d db
	@echo "Čekam bazu..."
	@sleep 3
	cd backend && cp -n .env.example .env || true
	cd backend && npm run db:push
	cd backend && npm run db:seed
	@echo "✅ Baza je spremna!"

dev:
	@echo "Pokrećem backend na :3001 i frontend na :3000"
	cd backend && npm run dev &
	cd frontend && npm run dev

scrape:
	cd backend && npm run scrape

check:
	cd backend && npm run typecheck
	cd frontend && npm run typecheck
