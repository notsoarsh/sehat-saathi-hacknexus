#!/bin/bash
# Database setup script for PostgreSQL
# Run this if you want to use a real PostgreSQL database instead of memory storage

# Create database
createdb sehat_saathi

# Alternative: Using Docker
# docker run --name sehat-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sehat_saathi -p 5432:5432 -d postgres:13

echo "Database setup complete. Update your .env file with the correct DATABASE_URL"
echo "For local PostgreSQL: DATABASE_URL=postgresql://username:password@localhost:5432/sehat_saathi"
