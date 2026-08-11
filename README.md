# StudioLink AI

Build a complete, production-ready full-stack web application called **Lemonade Studio** (or "LemonAI" – pick the cleaner name) — an advanced AI-powered Roblox development platform inspired by Lemonade AI.

### Core Vision

A beautiful, modern web dashboard that lets Roblox creators:

- Chat with a highly intelligent AI agent
- Generate, edit, debug, and optimize Luau scripts
- Generate and modify maps, terrain, models, and assets
- Connect in real-time (or near real-time) to an open Roblox Studio place via a companion Studio plugin + Roblox Open Cloud
- Have the AI actually apply changes into the place (scripts, instances, models, terrain, etc.)
- Iterate extremely fast with almost zero friction

The AI must feel extremely smart, context-aware, and proactive about fixing bugs and improving code quality.

### Key Features (Must Implement)

1. **Authentication & Project System**
   - Roblox OAuth / Open Cloud authentication (or mock it cleanly if full OAuth is complex)
   - Users can create multiple "Projects" that correspond to Roblox places
   - Each project stores: place ID, universe ID, last synced state, conversation history, generated assets
   - Project dashboard with search, tags, last edited, status (connected / disconnected)

2. **Real-time Studio Connection**
   - Clear "Connect to Studio" flow
   - Instructions + download link for a companion Roblox Studio plugin (you can generate the plugin code as a downloadable .rbxm or Lua files)
   - The web app talks to the plugin via HTTP (HttpService) or via Roblox Open Cloud APIs where possible
   - Live status indicator: Connected / Syncing / Disconnected
   - Ability to push scripts, models, and instance trees into the open place
   - Ability to pull current place structure (Explorer tree) into the web app for context

3. **AI Chat Interface (The Heart of the Product)**
   - Beautiful, modern chat UI (think Cursor + Claude + Lemonade combined)
   - Multi-turn conversations with full context of the current project
   - AI can:
     - Generate complete, production-quality Luau scripts (Modules, LocalScripts, ServerScripts)
     - Explain code, refactor, optimize, fix bugs
     - Create systems (inventory, combat, data stores, UI, etc.)
     - Generate maps / terrain descriptions that can be turned into actual Roblox terrain or models
     - Generate models (describe parts, unions, meshes, materials, properties)
     - Suggest and apply hierarchical instance trees
   - Streaming responses
   - Code blocks with syntax highlighting (Luau), copy button, "Apply to Studio" button, "Insert as ModuleScript" etc.
   - Ability to reference existing scripts/instances by name (@mentions style)
   - AI should automatically detect common bugs and offer one-click fixes
   - "Smart Mode" toggle: AI becomes more aggressive about best practices, performance, security, and clean architecture

4. **Script Generation & Management**
   - Dedicated Scripts tab showing all scripts in the connected place
   - Diff view when AI suggests changes
   - Version history for AI-generated scripts
   - One-click apply / reject / edit before applying
   - AI can write client + server + module combinations correctly

5. **Map & Model Generation**
   - Separate "Build" mode in the chat
   - User describes a map or model in natural language
   - AI outputs:
     - Structured JSON describing the instance hierarchy (Parts, Models, Folders, Terrain regions, Materials, Properties, Attributes)
     - Or a step-by-step build plan
   - "Generate & Push to Studio" button that sends the hierarchy to the plugin
   - Support for basic terrain generation instructions
   - Ability to iterate: "Make the castle taller and add a moat"

6. **Intelligence & Quality Features**
   - Context window includes: current project Explorer tree, previously generated scripts, conversation history
   - AI should write clean, modern Luau (type annotations where helpful, proper error handling, no deprecated APIs)
   - Automatic bug detection and self-correction loop
   - Performance tips and security checks (especially DataStores, RemoteEvents, FilteringEnabled best practices)
   - "Explain this system" and "Optimize this" commands
   - Memory of user preferences (coding style, preferred patterns)

7. **Additional Pages / Features**
   - Landing page (marketing) – modern, dark, developer-focused, with demo video placeholder and clear CTA
   - Pricing page (Free tier with limited daily prompts + Pro tier)
   - Settings (API keys if needed, theme, notification preferences)
   - Asset library (saved models/scripts the user generated)
   - Documentation / Help center with how the Studio connection works

### Technical Requirements

**Frontend**

- Next.js 14/15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui (or similar high-quality component library)
- Beautiful dark theme by default (with light mode option)
- Framer Motion for smooth animations
- React Query / TanStack Query for data fetching
- Streaming chat UI
- Code highlighting with Shiki or Prism (Luau support)

**Backend**

- Next.js API routes or separate NestJS / Hono backend
- Database: PostgreSQL via Supabase or Neon (projects, conversations, users, generated assets)
- Authentication: Clerk or NextAuth + Roblox OAuth simulation
- File storage for generated models / plugin files (S3 or Supabase Storage)
- WebSocket or Server-Sent Events for real-time status updates

**AI Integration**

- Use a powerful model (Claude 3.5/4, GPT-4o, or Grok) via API
- System prompt that makes the AI an expert Roblox engineer
- Tool calling so the AI can request "get current Explorer tree", "apply this script", "create these instances", etc.
- Structured outputs for scripts and instance hierarchies

**Roblox Side**

- Generate a clean Studio plugin that:
  - Listens for commands from the web app
  - Can create/edit scripts
  - Can build instance trees from JSON
  - Can report current place structure
  - Has a simple status UI inside Studio

### Design Requirements

- Extremely polished, modern developer tool aesthetic
- Dark mode first (deep charcoal / near-black backgrounds, subtle purple/blue accents)
- Clean typography (Inter or Geist)
- Excellent spacing and hierarchy
- Responsive (desktop primary, tablet usable)
- Loading states, empty states, and error states that feel premium
- Toast notifications for success/error when applying to Studio

### Non-Negotiables for Quality

- Zero placeholder "TODO" comments left in the final code
- Proper error handling everywhere
- Type-safe TypeScript
- Clean folder structure
- Mobile-friendly where it makes sense
- Accessibility basics
- The AI system prompt must be excellent and focused on high-quality Roblox development

### What to Build First (Implementation Order)

1. Landing page + Auth + Project dashboard
2. Chat interface with streaming
3. Project creation and mock Studio connection
4. Script generation + apply flow
5. Model/map generation structured output
6. Real plugin communication layer
7. Polish, pricing, settings

Make the entire experience feel like a professional tool that serious Roblox developers would actually want to use every day. Prioritize cleanliness, speed, and intelligence of the AI over flashy gimmicks.

Start by scaffolding the full application structure, then implement the core chat + project system first.

The current website is completely useless. It just generates text and yaps in the chat but does NOTHING in Roblox Studio. There is zero real connection.

I need you to completely implement a working connection system using a Roblox Studio plugin. This is the #1 priority right now.

### What needs to be built:

1. **Companion Roblox Studio Plugin**
   - Create a full, working Roblox Studio plugin (as downloadable .lua files or a clear plugin structure).
   - The plugin must:
     - Show a simple UI inside Studio (docked widget)
     - Let the user paste a connection token / project code from the website
     - Connect to our backend and stay connected
     - Continuously poll for pending commands every 1-2 seconds
     - Execute commands: create/edit scripts, create models/parts/folders hierarchy, set properties, etc.
     - Report back success or error to the backend
     - Be able to send the current Explorer tree structure when requested

2. **Backend Command System**
   - Create proper API endpoints for:
     - Generating a connection token for a project
     - Plugin registering itself as connected
     - Web app sending a command (create script, build model, etc.)
     - Plugin fetching pending commands
     - Plugin reporting command results
     - Fetching the current place hierarchy from the plugin

3. **Website Side Changes**
   - On the project page, clearly show:
     - Connection status (Disconnected / Waiting for Plugin / Connected)
     - Big "Connect to Studio" button that shows the token + instructions
     - Step-by-step instructions on how to install and connect the plugin
   - Every "Apply to Studio", "Push Script", "Build Model", "Create Instances" button must actually send a real command to the backend instead of just showing text.
   - When the AI generates a script or model, there must be a clear working "Apply to Studio" button that pushes it through the plugin.

4. **How the flow must work:**
   - User creates a project on the website
   - User gets a connection token
   - User installs the plugin in Roblox Studio and pastes the token
   - Plugin connects and stays connected
   - User talks to the AI on the website
   - When user clicks "Apply", the website sends the command → backend → plugin executes it inside the open place in Studio
   - Status updates in real time on the website

Make the connection system solid and actually functional. Stop generating fake "connected" states. I want real plugin communication.

Also generate the full plugin code cleanly so I can easily turn it into a .rbxm or upload it as a plugin.

This is critical. Do this properly. bug test make sure evrythign works and if you need me on my end to do anything tell me

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lemon-studio-ai-79.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f178018d-0d82-402d-8ac3-5948253a0817).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
