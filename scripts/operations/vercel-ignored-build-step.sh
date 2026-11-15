#!/usr/bin/env bash
# FILE: scripts/operations/vercel-ignored-build-step.sh
# Vercel "Ignored Build Step": exit 0 = skip build (deployment canceled); exit 1 = run build.
#
# Dashboard misconfiguration canceled every Production deployment:
#   if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi
# Demo/preview (custom environment) kept building. This script always proceeds so
# Production-target deployments reach READY and can receive production aliases.
exit 1