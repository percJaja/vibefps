# Code Request Template

When requesting code generation, please use this template for clearer communication:

```
## Feature Request

**Module**: [Specify which module this code is for]

**Functionality**: [Brief description of what the code should do]

**Integration Points**: [Which other modules will interact with this code]

**Event System Usage**: [Should this use the event system? If so, which events?]

**Special Requirements**: [Any particular requirements or constraints]

**Existing Code Reference**: [Reference to similar existing code if applicable]
```

## Example Request

```
## Feature Request

**Module**: TargetManager

**Functionality**: Add moving targets that follow bezier curves between random points

**Integration Points**: 
- Graphics.js for rendering
- Physics.js for collision detection

**Event System Usage**: 
- Should emit 'targetCreated' when new moving targets are created
- Should listen for 'difficultyChanged' to adjust speed

**Special Requirements**: 
- Must support mobile performance (limit to max 5 curve-based targets at once)
- Targets should have visual indicator of movement path

**Existing Code Reference**: 
- Similar to current moving targets but with curved paths instead of linear
```

This format helps me generate more appropriate and integrated code solutions.
