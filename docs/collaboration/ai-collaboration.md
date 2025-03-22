# AI Collaboration Guidelines

## Effective Communication with AI

### Best Practices for Code Requests

1. **Be specific about scope**
   - Clearly define what the code should and shouldn't do
   - Specify which files need to be modified

2. **Provide context**
   - Reference existing code that's similar
   - Explain how the new code fits into the architecture

3. **Highlight integration points**
   - Mention which modules will interact with this code
   - Specify events that should be used

4. **Use the Code Request Template**
   - Follow the defined template for consistency
   - Include all relevant sections

### Feedback Process

When providing feedback on generated code:

1. **Be specific about issues**
   - Instead of "This doesn't work," specify "The event isn't being emitted correctly in line 25"

2. **Provide error messages**
   - Include console errors or unexpected behaviors
   - Mention browser/device if relevant

3. **Highlight working parts**
   - Mention which aspects of the code are working correctly
   - This helps establish what should be preserved in revisions

## AI Output Interpretation

### Code Analysis

When the AI analyzes existing code:

- **Implementation details**: Specific explanations of how the code works
- **Architecture suggestions**: Recommendations for structural improvements
- **Integration notes**: How the code interacts with other modules

### Design Recommendations

When the AI provides design advice:

- **Options with tradeoffs**: Multiple approaches with pros/cons
- **Best practices**: Standard patterns for the specific context
- **Performance considerations**: Efficiency and optimization notes

## Limitations and Workarounds

### Known AI Limitations

1. **Context window limitations**
   - AI may not remember all details from earlier in conversation
   - Solution: Reference specific documents or code snippets

2. **Code complexity understanding**
   - AI may struggle with very complex interactions across many files
   - Solution: Break problems into smaller, focused requests

3. **Visual/spatial understanding**
   - AI doesn't have direct visual understanding of game rendering
   - Solution: Describe visual issues in detail, with specific coordinates/elements

### Effective Code Generation Strategies

1. **Iterative approach**
   - Start with skeleton/structure
   - Add functionality in layers
   - Test incrementally

2. **Module-based requests**
   - Focus on one module at a time
   - Clearly define interfaces between modules

3. **Template patterns**
   - Use established patterns from existing code
   - Point to examples of similar functionality
