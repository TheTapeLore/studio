---
description: Build or upgrade a pillar's visual-metaphor component
argument-hint: <metaphor name from content/metaphors.yaml | pillar>
---
Target: $ARGUMENTS. Read content/metaphors.yaml for its meaning, visual rules and props.
1. Build/upgrade engine/components/metaphors/<Name>.tsx using tokens only. Props must cover every use listed.
   Motion: one orchestrated move per beat; easing from tokens; it must read muted on a phone.
2. Add 3 variants to the gallery composition; render stills at 4x5 and 9x16; view them; iterate until it is the
   clearest possible picture of the idea (show a cold viewer test: describe what a newcomer would think it means).
3. Render a 10s demo clip to engine/out/metaphor-<name>.mp4 and commit the component + stills (not the MP4).
4. Update content/metaphors.yaml status: built, with prop docs.
