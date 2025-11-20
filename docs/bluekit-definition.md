# Definition of "BlueKit"

**BlueKit** is a modular, instruction-driven system for building and orchestrating software using AI-assisted code generation.  
A BlueKit project is composed of:

## 1. Kits (`*.kit.md`)
Atomic or composite instruction files that define:
- goals  
- requirements  
- instructions  
- dependencies  
- metadata  
- file outputs  
- composition of other kits  

## 2. Root Blueprints (`*.root.md`)
Act like Terraform root modules:
- orchestrate multiple kits  
- define global goals / requirements  
- declare dependencies  
- load parameter values  
- generate the whole project shape  

## 3. Values Files (`*.values.json`)
Parameterization layer for:
- theme  
- naming  
- colors  
- architecture choices  
- configuration flags  
Similar to Terraform variables.

## 4. BlueKit CLI
Commands:
- \`bluekit init\` – create base config + root blueprint  
- \`bluekit generate\` – generate kits & root blueprint  
- \`bluekit apply\` – apply kits & root to generate code (via Cursor MCP)  
- \`bluekit ping\` – health check  

## 5. BlueKit MCP Server
Combines:
- instructions  
- metadata  
- values  
- composition graph  
Then sends a code-generation plan to Cursor.

BlueKit is **Terraform for Code**, using AI to execute plans and generate software deterministically.
