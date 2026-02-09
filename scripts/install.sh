#!/bin/sh

if ! command -v deno &> /dev/null
then
    echo "Deno is not installed. Proceeding with installation..."
    curl -fsSL https://deno.land/install.sh | sh
else
    echo "Deno is already installed."
fi

deno install -g -f -r -A --unstable-kv https://raw.githubusercontent.com/vseplet/AgentSmith/refs/heads/main/source/main.ts --import-map=https://raw.githubusercontent.com/vseplet/AgentSmith/refs/heads/main/import-map.json -n smith
