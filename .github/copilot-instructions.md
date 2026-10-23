# Copilot Instructions

## Response Style
- To the point, no filler
- No surplus politeness or complex words
- Short and direct
- Explanations in bullet/structured format, not conversational
- Goal: readable, fewer tokens, productive

## Project Overview
Toolchain for Shelly device embedded scripts.

- **Input:** High-level JS templates (easy to write)
- **Output:** Low-level JS templates ready to flash on Shelly devices
- Scripts must run on-device, offline (no internet/wi-fi required in some cases)
- Language: JavaScript

## Project Goals
- [ ] Build high-level template examples
- [ ] Build matching low-level script examples
- [ ] Convert low-level scripts into low-level templates (with placeholders/params)
- [ ] Document build rules for high→low conversion
- [ ] (Later) Build a program to automate the conversion

## Folder Structure
| Folder | Purpose |
|---|---|
| `high-level-templates/` | User-facing templates, easy to write |
| `low-level-scripts/` | Raw low-level script examples |
| `low-level-templates/` | Final output templates for flashing |

## Conventions
- Placeholders format: `${paramName}`
- Each template must have a header comment: name, params, description
- Keep scripts minimal — Shelly devices have limited memory

