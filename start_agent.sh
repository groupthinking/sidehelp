#!/bin/bash
# Wrapper to run the Global Deep Research Agent
# Usage: ./start_agent.sh [path_to_analyze]

export PYTHONPATH=$PYTHONPATH:$(pwd)
python3 src/global_agent.py "$@"
